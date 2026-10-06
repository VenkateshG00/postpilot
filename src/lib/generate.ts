// Shared post generator (AI caption + AI image) used by custom-brief
// posts and by the cron. Server-only.
// Uses admin's ai_active_provider for AI image generation (Gemini, etc.)

const GROQ_API_KEY = process.env.GROQ_API_KEY

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

// ─── base64 data URL helper (edge-safe, chunked) ────────────────────────────
function toDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

// ─── AI Image Providers ─────────────────────────────────────────────────────

async function generateGeminiImage(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Gemini image error ${r.status}: ${err.slice(0, 200)}`)
  }
  type GeminiResp = { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] }
  const data = await r.json() as GeminiResp
  const part = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)
  if (!part?.inlineData) throw new Error('Gemini returned no image data')
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
}

async function generatePollinationsImage(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 999999)
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux&enhance=true`
}

async function generateReplicateImage(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')
  const r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=30' },
    body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'jpg', output_quality: 90, num_outputs: 1 } }),
  })
  const pred = await r.json() as { id?: string; status?: string; output?: string | string[]; error?: string; detail?: string }
  if (pred.status === 'succeeded') {
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
    if (typeof out === 'string' && out) return out
  }
  if (!pred.id) throw new Error(pred.detail || pred.error || 'Replicate failed')
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1500))
    const pr = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const p = await pr.json() as { status: string; output?: string | string[]; error?: string }
    if (p.status === 'succeeded') {
      const out = Array.isArray(p.output) ? p.output[0] : p.output
      if (typeof out === 'string') return out
    }
    if (p.status === 'failed' || p.status === 'canceled') throw new Error(p.error || 'Replicate failed')
  }
  throw new Error('Replicate timed out')
}

async function generateHuggingFaceImage(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_TOKEN
  if (!token) throw new Error('HUGGINGFACE_TOKEN not configured')
  const r = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4 } }),
  })
  if (!r.ok) throw new Error(`HuggingFace error ${r.status}`)
  const blob = await r.arrayBuffer()
  return toDataUrl(blob, 'image/jpeg')
}

async function generateCloudflareImage(prompt: string): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID
  const apiToken = process.env.CF_AI_TOKEN
  if (!accountId || !apiToken) throw new Error('CF_ACCOUNT_ID or CF_AI_TOKEN not configured')
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!r.ok) throw new Error(`Cloudflare AI error ${r.status}`)
  const blob = await r.arrayBuffer()
  return toDataUrl(blob, 'image/png')
}

async function generateAbhiBotsImage(prompt: string): Promise<string> {
  const apiKey = process.env.ABHIBOTS_API_KEY
  if (!apiKey) throw new Error('ABHIBOTS_API_KEY not configured')
  const r = await fetch('https://app.abhibots.com/api/ml/firefly/generate', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: 'image3', width: 1024, height: 1024, content_class: 'photo' }),
  })
  if (!r.ok) throw new Error(`AbhiBots error ${r.status}`)
  const data = await r.json() as { url?: string; all_urls?: string[] }
  const url = data.url || data.all_urls?.[0]
  if (!url) throw new Error('AbhiBots returned no image URL')
  return url
}

async function generateKieImage(prompt: string): Promise<string> {
  const apiKey = process.env.KIE_API_KEY
  if (!apiKey) throw new Error('KIE_API_KEY not configured')
  const models = ['flux-kontext-pro', 'flux1-kontext', 'flux-kontext-max']
  let taskId = ''
  for (const model of models) {
    const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: { prompt, aspect_ratio: '1:1' } }),
    })
    if (!res.ok) continue
    const data = await res.json() as { data?: { taskId?: string }; code?: number }
    if (data?.code && data.code !== 200 && data.code !== 0) continue
    taskId = data?.data?.taskId || ''
    if (taskId) break
  }
  if (!taskId) throw new Error('Kie.ai: no authorized model found')
  for (let i = 0; i < 20; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1500))
    const pr = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!pr.ok) continue
    const pd = await pr.json() as { data?: { state?: string; resultJson?: string; output?: string; url?: string } }
    const state = pd?.data?.state
    if (state === 'success' || state === 'completed') {
      try {
        const rStr = pd?.data?.resultJson || '{}'
        const result = typeof rStr === 'string' ? JSON.parse(rStr) : rStr
        const url = result?.resultImageUrl || result?.output || result?.url || pd?.data?.output || pd?.data?.url
        if (url) return url
      } catch { /* continue */ }
      throw new Error('Kie.ai task succeeded but no image URL')
    }
    if (state === 'fail' || state === 'failed') throw new Error('Kie.ai image generation failed')
  }
  throw new Error('Kie.ai timed out')
}

// Dispatch to the configured AI image provider
async function generateAIImageByProvider(provider: string, prompt: string): Promise<string> {
  switch (provider) {
    case 'gemini_flash': return generateGeminiImage(prompt)
    case 'replicate_flux': return generateReplicateImage(prompt)
    case 'pollinations': return generatePollinationsImage(prompt)
    case 'huggingface_flux': return generateHuggingFaceImage(prompt)
    case 'cloudflare_sdxl': return generateCloudflareImage(prompt)
    case 'abhibots_firefly': return generateAbhiBotsImage(prompt)
    case 'kie_flux': return generateKieImage(prompt)
    default: return generatePollinationsImage(prompt)
  }
}

// Upload base64 data-URL image to Supabase storage, return public URL.
// External URLs (Pollinations, Replicate) are returned as-is.
async function uploadToStorage(imageUrl: string, supabaseUrl: string, supabaseKey: string): Promise<string> {
  if (imageUrl.includes('/storage/v1/object/public/')) return imageUrl
  if (!imageUrl.startsWith('data:') && imageUrl.startsWith('http')) return imageUrl

  const comma = imageUrl.indexOf(',')
  const header = imageUrl.slice(0, comma)
  const mime = header.split(':')[1]?.split(';')[0] ?? 'image/jpeg'
  const b64 = imageUrl.slice(comma + 1)
  const binary = atob(b64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)

  const ext = mime === 'image/png' ? 'png' : 'jpg'
  const filename = `scheduled/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/ai-images/${filename}`, {
    method: 'POST',
    headers: { 'Content-Type': mime, apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    body: buffer,
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Storage upload failed: ${err.slice(0, 200)}`)
  }
  return `${supabaseUrl}/storage/v1/object/public/ai-images/${filename}`
}

// instruction = a free-text brief (custom posts) OR a topic/pillar (recurring).
export async function generatePost(
  instruction: string,
  biz: BizContext,
  opts?: { supabaseUrl?: string; supabaseKey?: string },
): Promise<{ caption: string; image_url: string } | null> {
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

  let parsed: Record<string, unknown> = {}
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch { /* use defaults */ }

  const captionText = boldify(String(parsed.caption ?? instruction))
  const hashtags = String(parsed.hashtags ?? '').trim()
  const caption = hashtags ? `${captionText}\n\n${hashtags}` : captionText

  // ── AI Image Generation (uses admin's ai_active_provider) ─────────────
  let image_url = ''
  let aiProvider = 'pollinations'

  if (opts?.supabaseUrl && opts?.supabaseKey) {
    try {
      const settingsRes = await fetch(
        `${opts.supabaseUrl}/rest/v1/app_settings?id=eq.1&select=ai_active_provider`,
        { headers: { 'Content-Type': 'application/json', apikey: opts.supabaseKey, Authorization: `Bearer ${opts.supabaseKey}` } },
      )
      const settings = await settingsRes.json()
      const provider = settings?.[0]?.ai_active_provider
      if (provider && provider !== 'none') aiProvider = provider
    } catch { /* use default */ }
  }

  const industryCtx = biz?.industry ? ` for a ${biz.industry} business` : ''
  const imagePrompt = [
    `A professional, high-quality Instagram photo${industryCtx}.`,
    `Theme: ${instruction}.`,
    parsed.image_keywords ? `Keywords: ${parsed.image_keywords}.` : '',
    'Photorealistic, vibrant colors, natural lighting, square 1:1 format.',
    'No text, no words, no watermarks, no overlays, no logos.',
  ].filter(Boolean).join(' ')

  try {
    image_url = await generateAIImageByProvider(aiProvider, imagePrompt)
    if (opts?.supabaseUrl && opts?.supabaseKey && image_url) {
      image_url = await uploadToStorage(image_url, opts.supabaseUrl, opts.supabaseKey)
    }
  } catch {
    // Fallback to Pollinations if primary provider fails
    if (aiProvider !== 'pollinations') {
      try { image_url = await generatePollinationsImage(imagePrompt) } catch { /* no image */ }
    }
  }

  return { caption, image_url }
}
