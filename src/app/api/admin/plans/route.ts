export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Confirm the caller is a signed-in super admin. Returns the user id or null.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  return profile?.is_admin ? user.id : null
}

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const key = String(body.key ?? '').trim().toLowerCase()
  if (!key || !/^[a-z0-9_]+$/.test(key)) {
    return NextResponse.json({ error: 'Invalid plan key (use lowercase letters, numbers, underscore)' }, { status: 400 })
  }

  // Build the row from the submitted fields (posts_per_day null = unlimited).
  const row = {
    key,
    name: String(body.name ?? key),
    price_inr: toIntOrNull(body.price_inr) ?? 0,
    channels_included: toIntOrNull(body.channels_included) ?? 1,
    posts_per_day: toIntOrNull(body.posts_per_day), // null = unlimited
    credits_per_month: toIntOrNull(body.credits_per_month) ?? 0,
    seats_included: toIntOrNull(body.seats_included) ?? 1,
    allow_dalle: Boolean(body.allow_dalle),
    white_label: Boolean(body.white_label),
    trial_days: toIntOrNull(body.trial_days) ?? 0,
    analytics_level: String(body.analytics_level ?? 'basic'),
    extra_channel_price: toIntOrNull(body.extra_channel_price) ?? 0,
    extra_seat_price: toIntOrNull(body.extra_seat_price) ?? 0,
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    sort_order: toIntOrNull(body.sort_order) ?? 0,
    updated_at: new Date().toISOString(),
  }

  const service = await createServiceClient()
  const { error } = await service.from('plans').upsert(row, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, plan: row })
}
