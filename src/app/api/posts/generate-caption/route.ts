export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

/* ── Plan-based caption generation limits (per month) ── */
const CAPTION_LIMITS: Record<string, number> = {
  free: 3,
  trial: 10,
  starter: 30,
  pro: 100,
  agency: 999,
}

/* Converts **bold** markdown to Unicode bold for Instagram */
function boldify(text: string): string {
  return text.replace(/\*\*([^*]+?)\*\*/g, (_m, p1: string) => {
    let out = ''
    for (const ch of p1) {
      const c = ch.codePointAt(0)!
      if (c >= 65 && c <= 90) out += String.fromCodePoint(0x1D5D4 + (c - 65))
      else if (c >= 97 && c <= 122) out += String.fromCodePoint(0x1D5EE + (c - 97))
      else if (c >= 48 && c <= 57) out += String.fromCodePoint(0x1D7EC + (c - 48))
      else out += ch
    }
    return out
  }).replace(/[*_`]/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}

  const mediaUrl = String(body.media_url ?? '').trim()
  const angle = String(body.angle ?? '').trim()
  const contentType = String(body.content_type ?? 'post').trim()

  if (!mediaUrl) return NextResponse.json({ error: 'No media provided' }, { status: 400 })

  /* ── Check caption generation limit ── */
  const { data: profile } = await supabase.from('profiles')
    .select('plan').eq('id', user.id).single()

  const plan = profile?.plan ?? 'free'
  const limit = CAPTION_LIMITS[plan] ?? CAPTION_LIMITS.free

  const svc = await createServiceClient()

  // Count generations this month using post_logs with status='caption_generated'
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { count: usedCount } = await svc
    .from('post_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'caption_generated')
    .gte('created_at', monthStart)
    .lt('created_at', nextMonth)

  const used = usedCount ?? 0

  if (used >= limit) {
    // Calculate reset date (first of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const resetStr = resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return NextResponse.json({
      error: 'caption_limit_reached',
      message: `You've used all ${limit} caption generations this month. Resets ${resetStr} or upgrade for more.`,
      generations_used: used,
      generations_limit: limit,
      reset_date: resetStr,
    }, { status: 429 })
  }

  /* ── Fetch business profile for context ── */
  const { data: biz } = await supabase.from('business_profiles')
    .select('business_name, industry, brand_voice, target_audience')
    .eq('user_id', user.id).maybeSingle()

  /* ── Build AI prompt ── */
  const isVideo = contentType === 'reel' || contentType === 'story'
  const mediaContext = isVideo
    ? 'The user has uploaded a video/reel. Based on the content type and any angle provided, write an engaging caption.'
    : `Analyze the image at this URL and write an engaging caption: ${mediaUrl}`

  const angleInstruction = angle
    ? `The user wants this specific angle/approach: "${angle}".`
    : 'Choose the best angle based on the media content.'

  const prompt = `You are a premium Instagram content strategist for ${biz?.business_name || 'a business'}${biz?.industry ? ` in the ${biz.industry} industry` : ''}. ${biz?.brand_voice ? `Brand voice: ${biz.brand_voice}.` : ''} Target audience: ${biz?.target_audience || 'general audience'}.

${mediaContext}

${angleInstruction}

Content type: Instagram ${contentType}.

Respond with ONLY a valid JSON object, no extra text:
{
  "caption": "Full Instagram caption with emojis and line breaks. Start with one emoji + a bold hook in **double asterisks**, then 2-3 engaging sentences, a call to action. Under 200 words.",
  "hashtags": [
    {"tag": "#hashtag1", "relevance": 95},
    {"tag": "#hashtag2", "relevance": 88},
    {"tag": "#hashtag3", "relevance": 82},
    {"tag": "#hashtag4", "relevance": 76},
    {"tag": "#hashtag5", "relevance": 70}
  ],
  "tones": [
    {"label": "question led", "score": 95},
    {"label": "contrarian", "score": 92},
    {"label": "relatable pov", "score": 88}
  ]
}

The "tones" array should contain 3 detected writing style indicators with confidence scores (0-100).
The "hashtags" array should contain exactly 5 hashtags with relevance scores (0-100).
The caption must be engaging, authentic, and optimized for Instagram ${contentType} engagement.`

  /* ── Call Groq AI ── */
  let raw = '{}'
  try {
    const messages: any[] = [{ role: 'user', content: prompt }]

    // For images, add the image URL in the message for vision models
    if (!isVideo && mediaUrl) {
      messages[0] = {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: mediaUrl } },
        ],
      }
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 1200,
        temperature: 0.9,
        top_p: 0.95,
        messages,
      }),
    })
    const d = await r.json()
    raw = d?.choices?.[0]?.message?.content ?? '{}'
  } catch {
    return NextResponse.json({ error: 'Generation failed, try again' }, { status: 502 })
  }

  /* ── Parse response ── */
  let parsed: any = {}
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {}

  const caption = boldify(String(parsed.caption ?? ''))
  const hashtags: { tag: string; relevance: number }[] = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.map((h: any) => ({
        tag: String(h.tag || h).startsWith('#') ? String(h.tag || h) : `#${String(h.tag || h)}`,
        relevance: Number(h.relevance ?? h.score ?? 80),
      }))
    : []

  const tones: { label: string; score: number }[] = Array.isArray(parsed.tones)
    ? parsed.tones.map((t: any) => ({
        label: String(t.label || t.name || ''),
        score: Number(t.score ?? t.confidence ?? 85),
      }))
    : [
        { label: 'engaging', score: 90 },
        { label: 'authentic', score: 85 },
        { label: 'conversational', score: 82 },
      ]

  if (!caption) {
    return NextResponse.json({ error: 'Could not generate caption, try again' }, { status: 502 })
  }

  /* ── Log the generation for rate limiting ── */
  await svc.from('post_logs').insert({
    user_id: user.id,
    status: 'caption_generated',
    caption: caption.slice(0, 200),
    content_type: contentType,
    platform: 'instagram',
  })

  return NextResponse.json({
    caption,
    hashtags,
    tones,
    generations_used: used + 1,
    generations_limit: limit,
  })
}
