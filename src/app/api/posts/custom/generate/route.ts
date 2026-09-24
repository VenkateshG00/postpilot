export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY

// Converts **bold** markdown to Unicode bold so Instagram renders it.
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

// Generates a one-off post from a free-text brief (1 credit). Returns a preview.
export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const brief = String(body.brief ?? '').trim()
  if (!brief) return NextResponse.json({ error: 'Tell us what the post is about' }, { status: 400 })

  const svc = await createServiceClient()

  // Spend 1 credit up front (atomic). NULL = insufficient balance.
  const { data: newBal, error: spendErr } = await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: 1 })
  if (spendErr) return NextResponse.json({ error: spendErr.message }, { status: 500 })
  if (newBal === null || newBal === undefined) {
    return NextResponse.json({ error: 'Out of credits — add credits or upgrade your plan' }, { status: 402 })
  }

  const refund = async () => { await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: -1 }) }

  const { data: biz } = await supabase.from('business_profiles')
    .select('business_name, industry, brand_voice, target_audience').eq('user_id', user.id).maybeSingle()

  const prompt = `You are a premium social media manager for ${biz?.business_name || 'a business'}, a ${biz?.brand_voice || 'professional'} ${biz?.industry || ''} business in India. Write ONE Instagram post for this specific request: "${brief}". Respond with ONLY a valid JSON object, no extra text: {"image_keywords":"4-5 photo search keywords matching the request","caption":"full caption with emojis and line breaks","hashtags":"3-5 relevant professional hashtags"}. Caption: start with one emoji + a bold hook in **double asterisks**, 2-3 sentences, a strong call to action, under 200 words. Use only 3-5 professional hashtags. Target audience: ${biz?.target_audience || 'general'}.`

  let raw = '{}'
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', max_tokens: 900, temperature: 1, top_p: 0.95, messages: [{ role: 'user', content: prompt }] }),
    })
    const d = await r.json()
    raw = d?.choices?.[0]?.message?.content ?? '{}'
  } catch {
    await refund()
    return NextResponse.json({ error: 'Generation failed, try again' }, { status: 502 })
  }

  let parsed: any = {}
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {}

  const captionText = boldify(String(parsed.caption ?? brief))
  const hashtags = String(parsed.hashtags ?? '').trim()
  const caption = hashtags ? `${captionText}\n\n${hashtags}` : captionText

  let image_url = ''
  if (PEXELS_API_KEY) {
    try {
      const kw = encodeURIComponent(String(parsed.image_keywords || biz?.industry || 'business'))
      const pr = await fetch(`https://api.pexels.com/v1/search?query=${kw}&per_page=15&page=${Math.floor(Math.random() * 5) + 1}`, { headers: { Authorization: PEXELS_API_KEY } })
      const pd = await pr.json()
      const photos = pd?.photos ?? []
      if (photos.length) image_url = `${photos[Math.floor(Math.random() * photos.length)].src.original}?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1080`
    } catch {}
  }

  return NextResponse.json({ caption, image_url, topic: brief.slice(0, 60), credits_left: newBal })
}
