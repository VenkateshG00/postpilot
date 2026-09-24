export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// Generates 6-8 tailored content pillars for a business, via Groq.
// Client calls it for their own profile (fields passed inline); admin can
// target another user with { userId } (read from DB).
export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}

  let biz: any = {
    business_name: body.business_name,
    industry: body.industry,
    description: body.description,
    target_audience: body.target_audience,
    brand_voice: body.brand_voice,
  }

  // No inline fields -> read from DB (admin may target another user).
  if (!biz.business_name && !biz.industry) {
    let targetId = user.id
    if (body.userId && body.userId !== user.id) {
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      targetId = String(body.userId)
    }
    const svc = await createServiceClient()
    const { data: row } = await svc.from('business_profiles')
      .select('business_name, industry, description, target_audience, brand_voice')
      .eq('user_id', targetId).maybeSingle()
    if (row) biz = row
  }

  if (!biz.business_name && !biz.industry) {
    return NextResponse.json({ error: 'No business profile to generate from yet' }, { status: 400 })
  }

  const prompt = `You are a social media strategist. For the business below, give 7 short CONTENT PILLARS — recurring themes it can post about. Each pillar is 2-4 words, specific to this exact business and industry (not generic). Respond with ONLY a JSON array of strings, no other text.\n\nBusiness: ${biz.business_name || ''}\nIndustry: ${biz.industry || ''}\nWhat they do: ${biz.description || ''}\nAudience: ${biz.target_audience || ''}\nBrand voice: ${biz.brand_voice || ''}`

  let raw = '[]'
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 400,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await r.json()
    raw = data?.choices?.[0]?.message?.content ?? '[]'
  } catch {
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
  }

  let topics: string[] = []
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
    const arr = JSON.parse(cleaned)
    if (Array.isArray(arr)) topics = arr.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 8)
  } catch {}

  if (!topics.length) return NextResponse.json({ error: 'Could not generate topics, try again' }, { status: 502 })
  return NextResponse.json({ topics })
}
