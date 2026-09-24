// Shared post generator (Groq caption + Pexels image) used by custom-brief
// posts and by the approval-hold path in the cron. Server-only.

const GROQ_API_KEY = process.env.GROQ_API_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY

export interface BizContext {
  business_name?: string | null
  industry?: string | null
  brand_voice?: string | null
  target_audience?: string | null
}

// Convert **bold** markdown to Unicode bold so Instagram renders it.
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

// instruction = a free-text brief (custom posts) OR a topic/pillar (recurring).
export async function generatePost(instruction: string, biz: BizContext): Promise<{ caption: string; image_url: string } | null> {
  if (!GROQ_API_KEY) return null

  const prompt = `You are a premium social media manager for ${biz?.business_name || 'a business'}, a ${biz?.brand_voice || 'professional'} ${biz?.industry || ''} business in India. Write ONE Instagram post about: "${instruction}". Respond with ONLY a valid JSON object, no extra text: {"image_keywords":"4-5 photo search keywords matching the topic","caption":"full caption with emojis and line breaks","hashtags":"3-5 relevant professional hashtags"}. Caption: start with one emoji + a bold hook in **double asterisks**, 2-3 sentences, a strong call to action, under 200 words. Use only 3-5 professional hashtags. Target audience: ${biz?.target_audience || 'general'}.`

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
    return null
  }

  let parsed: any = {}
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {}

  const captionText = boldify(String(parsed.caption ?? instruction))
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

  return { caption, image_url }
}
