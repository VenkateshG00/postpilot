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



/* Extract JSON from AI response that might have extra text around it */
function extractJSON(text: string): any {
  const s = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }
  return null
}

/* Call Groq vision model */
async function callVision(
  model: string,
  prompt: string,
  imageContent: { type: string; image_url: { url: string } },
  apiKey: string,
): Promise<string | null> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            imageContent,
          ],
        }],
      }),
    })
    if (!r.ok) {
      console.error(`Vision call failed (${r.status}):`, await r.text().catch(() => ''))
      return null
    }
    const d = await r.json()
    return d?.choices?.[0]?.message?.content ?? null
  } catch (e) {
    console.error('Vision fetch error:', e)
    return null
  }
}

/* Call Groq text model */
async function callText(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: TEXT_MODEL,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) {
      console.error(`Text call failed (${r.status})`)
      return null
    }
    const d = await r.json()
    return d?.choices?.[0]?.message?.content ?? null
  } catch (e) {
    console.error('Text fetch error:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}

  const imageBase64 = String(body.image_base64 ?? '').trim()
  const angle = String(body.angle ?? '').trim()
  const contentType = String(body.content_type ?? 'post').trim()
  const tone = String(body.tone ?? '').trim()

  if (!imageBase64) return NextResponse.json({ error: 'No media provided' }, { status: 400 })

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
      generations_used: used, generations_limit: limit, reset_date: resetStr,
    }, { status: 429 })
  }

  /* ── Determine content type ── */
  const isVideoFile = !imageBase64.startsWith('data:image/')
  const contentLabel = contentType === 'reel' ? 'Reel' : contentType === 'story' ? 'Story' : 'Post'

  const angleLine = angle
    ? `Angle/approach the user wants: "${angle}".`
    : ''

  const toneLine = tone
    ? `WRITING STYLE: Write the caption in a "${tone}" tone. This is the most important style instruction.`
    : ''

  const jsonFormat = `Respond with ONLY valid JSON. No explanation before or after. No markdown fences.

{
  "caption": "The Instagram caption text",
  "hashtags": [
    {"tag": "#example1", "relevance": 95},
    {"tag": "#example2", "relevance": 88},
    {"tag": "#example3", "relevance": 82},
    {"tag": "#example4", "relevance": 76},
    {"tag": "#example5", "relevance": 70}
  ],
  "tones": [
    {"label": "relatable pov", "score": 95},
    {"label": "contrarian", "score": 88},
    {"label": "question led", "score": 82}
  ]
}

Caption rules:
- Start with one emoji + a bold hook in **double asterisks**
- Then 2-3 engaging sentences
- End with a call to action
- Under 200 words
- Must feel native to Instagram

Tones: ALWAYS return exactly these 3: "relatable pov", "contrarian", "question led" with scores 0-100.
Hashtags: exactly 5, with relevance scores 0-100.`

  let raw: string | null = null

  /* ══════════════════════════════════════════════════════
     IMAGE FLOW — Three attempts to get image-aware caption
     ══════════════════════════════════════════════════════ */
  if (!isVideoFile) {
    /*
     * VISION PROMPT — NO business profile context at all.
     * The model must describe the image and caption THAT.
     */
    const visionPrompt = `You are an Instagram caption writer. I am showing you an image.

TASK:
1. First, identify what is in this image (the main subject, objects, setting, colors, mood).
2. Then write an Instagram ${contentLabel} caption that is specifically about what you see in this image.

${toneLine}
${angleLine}

IMPORTANT: Your caption MUST describe or relate to what is visually in the image. For example:
- If you see a car → write about the car
- If you see food → write about the food  
- If you see a person → write about them
- If you see a landscape → write about the place
Do NOT write about health, food, motivation, or any other topic unless that is what the image actually shows.

${jsonFormat}`

    /* ── Vision model with base64 from browser ── */
    console.log('Vision call with browser base64')
    raw = await callVision(
      VISION_MODEL,
      visionPrompt,
      { type: 'image_url', image_url: { url: imageBase64 } },
      GROQ_API_KEY,
    )

    if (raw && !extractJSON(raw)) {
      console.error('Vision returned non-JSON:', raw.slice(0, 300))
      raw = null
    }

    /* ── Text model fallback ── */
    if (!raw) {
      console.log('Fallback: Text model')
      const textPrompt = `You are an Instagram caption writer. The user uploaded a photo for an Instagram ${contentLabel}. Since I cannot see the image, write a versatile, engaging caption that works for a visually striking photo.

${toneLine}
${angleLine}

Do NOT assume what the image is about. Write something general but compelling like "This view hits different" or "Some things just speak for themselves."

${jsonFormat}`

      raw = await callText(textPrompt, GROQ_API_KEY)
    }

  } else {
    /* ══════════════════════════════════════════════════════
       VIDEO FLOW — Text model only
       ══════════════════════════════════════════════════════ */
    const videoPrompt = `You are an Instagram caption writer. The user uploaded a video for an Instagram ${contentLabel}. Write an engaging caption.

${toneLine}
${angleLine}

${jsonFormat}`

    raw = await callText(videoPrompt, GROQ_API_KEY)
  }

  if (!raw) {
    return NextResponse.json({ error: 'AI service error, try again' }, { status: 502 })
  }

  /* ── Parse response ── */
  const parsed = extractJSON(raw)
  if (!parsed) {
    console.error('All attempts returned invalid JSON. Last raw:', raw.slice(0, 500))
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

  /* ── Log the generation ── */
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
