export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user.id : null
}

const VALID_AI_PROVIDERS = ['none', 'replicate_flux', 'gemini_flash', 'huggingface_flux', 'cloudflare_sdxl', 'pollinations']

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const service = await createServiceClient()

  // Validate & sanitise ai_provider_credits JSONB
  const rawCredits = body.ai_provider_credits
  const providerCredits: Record<string, number> = {}
  if (rawCredits && typeof rawCredits === 'object') {
    for (const [k, v] of Object.entries(rawCredits)) {
      if (VALID_AI_PROVIDERS.includes(k) && k !== 'none') {
        providerCredits[k] = Math.max(1, Math.min(20, Math.trunc(Number(v) || 1)))
      }
    }
  }

  const rawProvider = String(body.ai_active_provider ?? 'none')

  const settings = {
    id: 1,
    default_trial_days: Math.trunc(Number(body.default_trial_days) || 7),
    default_image_provider: String(body.default_image_provider ?? 'pexels'),
    ai_active_provider: VALID_AI_PROVIDERS.includes(rawProvider) ? rawProvider : 'none',
    ai_provider_credits: providerCredits,
    cron_frequency: String(body.cron_frequency ?? ''),
    maintenance_mode: Boolean(body.maintenance_mode),
    announcement_banner: body.announcement_banner ? String(body.announcement_banner) : null,
    updated_at: new Date().toISOString(),
  }
  const { error: sErr } = await service.from('app_settings').upsert(settings, { onConflict: 'id' })
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  // Optional: credit-pack pricing
  if (Array.isArray(body.credit_packs)) {
    for (const pack of body.credit_packs) {
      if (!pack?.name) continue
      const { error: pErr } = await service.from('credit_packs').update({
        credits: Math.trunc(Number(pack.credits) || 0),
        price_inr: Math.trunc(Number(pack.price_inr) || 0),
        is_active: pack.is_active === undefined ? true : Boolean(pack.is_active),
      }).eq('name', String(pack.name))
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
