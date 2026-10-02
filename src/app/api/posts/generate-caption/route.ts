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

/* Vision model for image analysis, text model for video/fallback */
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT_MODEL = 'openai/gpt-oss-120b'

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

/* Fetch image from URL and convert to base64 data URI */
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || 'image/jpeg'
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

/* Extract JSON from AI response that might have extra text around it */
function extractJSON(text: string): any {
  // Strip markdown code fences
  let s = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  // Try direct parse first
  try { return JSON.parse(s) } catch {}
  // Try to find JSON object in the text
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }
  return null
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
  const tone = String(body.tone ?? '').trim()

  if (!mediaUrl) return NextResponse.json({ error: 'No media provided' }, { status: 400 })

  /* ── Check caption generation limit ── */
  const { data: profile } = await supabase.from('profiles')
    .select('plan').eq('id', user.id).single()

  const plan = profile?.plan ?? 'free'
  const limit = CAPTION_LIMITS[plan] ?? CAPTION_LIMITS.free

  const svc = await createServiceClient()

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

  /* ── Determine if media is an image (use vision) or video (use text) ── */
  const isVideo = contentType === 'reel' || contentType === 'story'
  const isImage = !isVideo || mediaUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i)
  const useVision = isImage && !mediaUrl.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i)

  const angleInstruction = angle
    ? `The user wants this specific angle/approach: "${angle}".`
    : 'Choose the best engaging angle based on what you see in the image.'

  const toneInstruction = tone
    ? `IMPORTANT: Write the caption in a "${tone}" tone/style. This is the PRIMARY writing style to use.`
    : ''

  const contentLabel = contentType === 'reel' ? 'Reel (video)' : contentType === 'story' ? 'Story' : 'Post (image)'

  const jsonFormat = `You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no extra text before or after. Just the JSON:
{
  "caption": "Full Instagram caption with emojis and line breaks. Start with one emoji + a bold hook in **double asterisks**, then 2-3 engaging sentences, end with a strong call to action. Keep it under 200 words.",
  "hashtags": [
    {"tag": "#hashtag1", "relevance": 95},
    {"tag": "#hashtag2", "relevance": 88},
    {"tag": "#hashtag3", "relevance": 82},
    {"tag": "#hashtag4", "relevance": 76},
    {"tag": "#hashtag5", "relevance": 70}
  ],
  "tones": [
    {"label": "relatable pov", "score": 95},
    {"label": "contrarian", "score": 92},
    {"label": "question led", "score": 88}
  ]
}

Rules:
- "tones": ALWAYS return exactly these 3 tones with confidence scores (0-100): "relatable pov", "contrarian", "question led". Score them based on how well each style fits the image content.
- "hashtags": exactly 5 relevant hashtags with relevance scores (0-100). Mix niche and broad. Hashtags MUST relate to what is shown in the image.
- Caption must feel native to Instagram — authentic, not corporate.
- The caption MUST be about what is visually shown in the image. Do NOT write about unrelated topics.`

  /* Business context is secondary — only used to adjust voice, never to override image content */
  const bizVoice = biz?.brand_voice
    ? `Adjust the writing voice to match: ${biz.brand_voice}. But the caption topic MUST be about the image content, not the business category.`
    : ''
  const audienceHint = biz?.target_audience
    ? `Target audience: ${biz.target_audience}.`
    : ''

  let raw = '{}'
  try {
    if (useVision) {
      /* ── Convert image to base64 so the vision model can actually see it ── */
      const base64Img = await imageToBase64(mediaUrl)

      if (base64Img) {
        /* ── Vision model with base64 image ── */
        const prompt = `STEP 1: Look at this image very carefully. Describe in detail EXACTLY what you see — objects, people, colors, setting, mood, action happening.

STEP 2: Based ONLY on what you described in Step 1, write a perfect Instagram ${contentLabel} caption about THIS specific image.

${toneInstruction}
${angleInstruction}
${bizVoice}
${audienceHint}

CRITICAL RULES:
- The caption MUST be about what is IN this image. If you see a car, write about the car. If you see food, write about the food.
- Do NOT ignore the image and write about something else.
- Do NOT default to generic motivational or business content.

${jsonFormat}`

        const messages = [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: base64Img } },
          ],
        }]

        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: VISION_MODEL,
            max_tokens: 1200,
            temperature: 0.8,
            messages,
          }),
        })

        if (r.ok) {
          const d = await r.json()
          raw = d?.choices?.[0]?.message?.content ?? '{}'
        } else {
          console.error('Vision model error:', r.status, await r.text())
          // Fall through to text fallback below
        }
      }

      /* If vision failed or image couldn't be fetched, fall back to text model */
      if (raw === '{}') {
        const fallbackPrompt = `The user has uploaded an image for an Instagram ${contentLabel}. The image URL is: ${mediaUrl}

Write an engaging caption. Since I cannot show you the image directly, write a versatile, engaging caption.

${toneInstruction}
${angleInstruction}
${bizVoice}
${audienceHint}

${jsonFormat}`

        const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: TEXT_MODEL,
            max_tokens: 1200,
            temperature: 0.8,
            messages: [{ role: 'user', content: fallbackPrompt }],
          }),
        })

        if (!r2.ok) {
          console.error('Text fallback error:', r2.status)
          return NextResponse.json({ error: 'AI service error, try again' }, { status: 502 })
        }
        const d2 = await r2.json()
        raw = d2?.choices?.[0]?.message?.content ?? '{}'
      }

    } else {
      /* ── Text model: for videos or non-image media ── */
      const prompt = `The user has uploaded media for an Instagram ${contentLabel}. Write an engaging caption for it.

${toneInstruction}
${angleInstruction}
${bizVoice}
${audienceHint}

${jsonFormat}`

      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: TEXT_MODEL,
          max_tokens: 1200,
          temperature: 0.8,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!r.ok) {
        console.error('Text model error:', r.status)
        return NextResponse.json({ error: 'AI service error, try again' }, { status: 502 })
      }
      const d = await r.json()
      raw = d?.choices?.[0]?.message?.content ?? '{}'
    }

  } catch (e) {
    console.error('Groq fetch error:', e)
    return NextResponse.json({ error: 'Generation failed, try again' }, { status: 502 })
  }

  /* ── Parse response — use robust JSON extraction ── */
  const parsed = extractJSON(raw)
  if (!parsed) {
    console.error('JSON parse error. Raw:', raw.slice(0, 500))
    return NextResponse.json({ error: 'AI returned invalid response, try again' }, { status: 502 })
  }

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
        { label: 'relatable pov', score: 90 },
        { label: 'contrarian', score: 85 },
        { label: 'question led', score: 82 },
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
