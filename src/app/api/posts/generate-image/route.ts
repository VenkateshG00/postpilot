export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const POLL_INTERVAL_MS = 1500
const MAX_POLL_ATTEMPTS = 20

// ─── Provider registry ────────────────────────────────────────────────────────
// Add new providers here. credits come from app_settings.ai_provider_credits.
const AI_PROVIDERS: Record<string, { label: string; quality: number; suggestedCredits: number }> = {
  replicate_flux:   { label: 'Flux Schnell (Replicate)',     quality: 4, suggestedCredits: 4 },
  gemini_flash:     { label: 'Gemini Flash (Google)',        quality: 3, suggestedCredits: 2 },
  huggingface_flux: { label: 'Flux Schnell (Hugging Face)',  quality: 3, suggestedCredits: 3 },
  cloudflare_sdxl:  { label: 'SDXL Lightning (Cloudflare)', quality: 2, suggestedCredits: 2 },
  pollinations:     { label: 'Pollinations.ai',              quality: 1, suggestedCredits: 1 },
}

// ─── Replicate ────────────────────────────────────────────────────────────────
async function pollReplicate(id: string, token: string): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pred = await r.json() as { status: string; output?: string | string[]; error?: string; detail?: string }
    if (pred.status === 'succeeded') {
      const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
      if (typeof out === 'string' && out) return out
      throw new Error('Replicate returned no image URL')
    }
    if (pred.status === 'failed' || pred.status === 'canceled')
      throw new Error(pred.error || pred.detail || 'Replicate generation failed')
  }
  throw new Error('Replicate timed out — try again')
}

async function generateReplicate(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  const r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5',
    },
    body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'jpg', output_quality: 90, num_outputs: 1 } }),
  })
  const pred = await r.json() as { id?: string; status?: string; output?: string | string[]; error?: string; detail?: string }
  if (pred.status === 'succeeded') {
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
    if (typeof out === 'string' && out) return out
  }
  if (!pred.id) throw new Error(pred.detail || pred.error || 'Failed to start Replicate prediction')
  return pollReplicate(pred.id, token)
}

// ─── Pollinations ─────────────────────────────────────────────────────────────
// Returns a URL — image is loaded by the browser on demand, uploaded to storage only at publish time.
async function generatePollinations(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 999999)
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux&enhance=true`
}

// ─── Google Gemini Flash image generation ────────────────────────────────────
// Free tier: 1 500 req/day, 15 req/min. Returns base64 data URL directly.
async function generateGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
  )
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Gemini error ${r.status}: ${err.slice(0, 200)}`)
  }
  type GeminiResp = { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] }
  const data = await r.json() as GeminiResp
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!part?.inlineData) throw new Error('Gemini returned no image data')
  const { mimeType, data: b64 } = part.inlineData
  return `data:${mimeType};base64,${b64}`
}

// ─── Hugging Face ─────────────────────────────────────────────────────────────
// Returns a base64 data URL — uploaded to storage only at publish time.
async function generateHuggingFace(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_TOKEN
  if (!token) throw new Error('HUGGINGFACE_TOKEN not configured')

  const r = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4 } }),
  })
  if (!r.ok) {
    const err = await r.text()
    // Error 1016 = Cloudflare DNS error — HF free tier no longer routes FLUX models
    if (err.includes('1016') || r.status === 503) {
      throw new Error('HuggingFace free inference is unavailable for this model. Switch to Pollinations (free) or Replicate (paid) in Admin → Settings.')
    }
    throw new Error(`HuggingFace error ${r.status}: ${err.slice(0, 150)}`)
  }
  const blob = await r.arrayBuffer()
  return toDataUrl(blob, 'image/jpeg')
}

// ─── Cloudflare Workers AI ────────────────────────────────────────────────────
// Returns a base64 data URL — uploaded to storage only at publish time.
async function generateCloudflare(prompt: string): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID
  const apiToken  = process.env.CF_AI_TOKEN
  if (!accountId || !apiToken) throw new Error('CF_ACCOUNT_ID or CF_AI_TOKEN not configured')

  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    },
  )
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Cloudflare AI error: ${err.slice(0, 200)}`)
  }
  const blob = await r.arrayBuffer()
  return toDataUrl(blob, 'image/png')
}

// ─── base64 data URL helper (edge-safe, chunked to avoid stack overflow) ──────
function toDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

// ─── Main route ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()

  // Read active provider + credits from app_settings
  const { data: appCfg } = await svc
    .from('app_settings')
    .select('ai_active_provider, ai_provider_credits')
    .eq('id', 1)
    .maybeSingle()

  const provider = appCfg?.ai_active_provider ?? 'none'
  if (provider === 'none') {
    return NextResponse.json({ error: 'AI image generation is currently disabled' }, { status: 503 })
  }

  const creditsMap = (appCfg?.ai_provider_credits ?? {}) as Record<string, number>
  const creditCost = creditsMap[provider] ?? AI_PROVIDERS[provider]?.suggestedCredits ?? 4

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}
  const brief = String(body.brief ?? '').trim()
  const caption = String(body.caption ?? '').trim()
  if (!brief && !caption) return NextResponse.json({ error: 'Brief is required' }, { status: 400 })

  // Deduct credits atomically
  const { data: newBal, error: spendErr } = await svc.rpc('spend_credits', {
    p_user_id: user.id,
    p_amount: creditCost,
  })
  if (spendErr) return NextResponse.json({ error: spendErr.message }, { status: 500 })
  if (newBal === null || newBal === undefined) {
    return NextResponse.json(
      { error: `Not enough credits — this provider costs ${creditCost} credits` },
      { status: 402 },
    )
  }

  const refund = async () => {
    await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: -creditCost })
  }

  // Build image prompt
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('industry')
    .eq('user_id', user.id)
    .maybeSingle()

  const industryCtx = biz?.industry ? ` for a ${biz.industry} business` : ''
  // Use caption for richer visual context — it describes the post content in detail
  const captionSnippet = caption ? caption.slice(0, 300) : ''
  const imagePrompt = [
    `A professional, high-quality Instagram photo${industryCtx}.`,
    `Theme: ${brief || 'social media post'}.`,
    captionSnippet ? `Post content for visual inspiration: "${captionSnippet}"` : '',
    'Photorealistic, vibrant colors, natural lighting, square 1:1 format.',
    'No text, no words, no watermarks, no overlays, no logos.',
  ].filter(Boolean).join(' ')

  // Dispatch to active provider
  let image_url: string
  try {
    if (provider === 'replicate_flux') {
      image_url = await generateReplicate(imagePrompt)
    } else if (provider === 'gemini_flash') {
      image_url = await generateGemini(imagePrompt)
    } else if (provider === 'pollinations') {
      image_url = await generatePollinations(imagePrompt)
    } else if (provider === 'huggingface_flux') {
      image_url = await generateHuggingFace(imagePrompt)
    } else if (provider === 'cloudflare_sdxl') {
      image_url = await generateCloudflare(imagePrompt)
    } else {
      await refund()
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 500 })
    }
  } catch (e: unknown) {
    await refund()
    const msg = e instanceof Error ? e.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return NextResponse.json({ image_url, credits_left: newBal, provider, credits_used: creditCost })
}
