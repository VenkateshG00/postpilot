export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const AI_IMAGE_CREDITS = 4
const POLL_INTERVAL_MS = 1500
const MAX_POLL_ATTEMPTS = 20 // ~30s max wait

// Polls a Replicate prediction until it succeeds, fails, or times out.
async function pollPrediction(predictionId: string, token: string): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    const r = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pred = await r.json() as { status: string; output?: string | string[]; error?: string; detail?: string }
    if (pred.status === 'succeeded') {
      const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
      if (typeof out === 'string' && out) return out
      throw new Error('Model returned no image URL')
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
      throw new Error(pred.error || pred.detail || 'Image generation failed on Replicate')
    }
    // status is 'starting' or 'processing' — keep polling
  }
  throw new Error('Image generation timed out after 30 s — try again')
}

// Generates an AI image via Flux Schnell on Replicate. Costs 4 credits.
export async function POST(req: NextRequest) {
  // Read inside handler — required for Cloudflare edge runtime env var access
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'AI image generation is not configured (missing REPLICATE_API_TOKEN)' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if admin has enabled AI image generation
  const svc0 = await createServiceClient()
  const { data: appCfg } = await svc0.from('app_settings').select('ai_image_provider').eq('id', 1).maybeSingle()
  const aiProvider = appCfg?.ai_image_provider ?? 'none'
  if (aiProvider === 'none') {
    return NextResponse.json({ error: 'AI image generation is currently disabled' }, { status: 503 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}
  const brief = String(body.brief ?? '').trim()
  if (!brief) return NextResponse.json({ error: 'Brief is required' }, { status: 400 })

  const svc = await createServiceClient()

  // Spend 4 credits up front (atomic). NULL = insufficient balance.
  const { data: newBal, error: spendErr } = await svc.rpc('spend_credits', {
    p_user_id: user.id,
    p_amount: AI_IMAGE_CREDITS,
  })
  if (spendErr) return NextResponse.json({ error: spendErr.message }, { status: 500 })
  if (newBal === null || newBal === undefined) {
    return NextResponse.json(
      { error: `Not enough credits — AI images cost ${AI_IMAGE_CREDITS} credits` },
      { status: 402 },
    )
  }

  const refund = async () => {
    await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: -AI_IMAGE_CREDITS })
  }

  // Fetch business context to make the prompt relevant.
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('business_name, industry, brand_voice')
    .eq('user_id', user.id)
    .maybeSingle()

  const industryCtx = biz?.industry ? ` for a ${biz.industry} business` : ''
  const imagePrompt = [
    `A professional, high-quality Instagram photo${industryCtx} about: ${brief}.`,
    'Clean composition, vibrant colors, natural lighting, square format.',
    'No text, no watermarks, no overlays. Photorealistic, editorial style.',
  ].join(' ')

  // Start Flux Schnell prediction.
  let predictionId: string
  try {
    const r = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=5', // ask Replicate to wait up to 5s before returning (fast-path)
        },
        body: JSON.stringify({
          input: {
            prompt: imagePrompt,
            aspect_ratio: '1:1',
            output_format: 'jpg',
            output_quality: 90,
            num_outputs: 1,
          },
        }),
      },
    )
    const pred = await r.json() as {
      id?: string
      status?: string
      output?: string | string[]
      error?: string
      detail?: string  // Replicate auth/validation errors use this field
    }

    // If Replicate fast-path already finished, return immediately.
    if (pred.status === 'succeeded') {
      const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
      if (typeof out === 'string' && out) {
        return NextResponse.json({ image_url: out, credits_left: newBal })
      }
    }

    if (!pred.id) {
      await refund()
      // pred.detail covers auth errors ("Invalid token."), pred.error covers model errors
      const reason = pred.detail || pred.error || 'Failed to start image generation'
      return NextResponse.json({ error: reason }, { status: 502 })
    }
    predictionId = pred.id
  } catch {
    await refund()
    return NextResponse.json({ error: 'Image generation service unavailable' }, { status: 502 })
  }

  // Poll until done.
  let image_url: string
  try {
    image_url = await pollPrediction(predictionId, REPLICATE_API_TOKEN)
  } catch (e: unknown) {
    await refund()
    const msg = e instanceof Error ? e.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return NextResponse.json({ image_url, credits_left: newBal })
}
