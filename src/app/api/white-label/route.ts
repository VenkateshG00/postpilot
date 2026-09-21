export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/plans-db'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  const plan = await getPlan(profile?.plan ?? 'free')
  if (!plan.white_label) return NextResponse.json({ error: 'White-label is an Agency-plan feature' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  // Only the branding fields are writable here (never plan/credits/etc.).
  const service = await createServiceClient()
  const { error } = await service.from('profiles').update({
    brand_name: body.brand_name ? String(body.brand_name).slice(0, 60) : null,
    brand_logo_url: body.brand_logo_url ? String(body.brand_logo_url).slice(0, 500) : null,
    brand_color: body.brand_color ? String(body.brand_color).slice(0, 20) : null,
  }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
