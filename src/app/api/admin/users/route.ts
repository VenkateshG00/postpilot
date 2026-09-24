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

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const userId = String(body.user_id ?? '')
  const action = String(body.action ?? '')
  if (!userId || !action) return NextResponse.json({ error: 'Missing user_id or action' }, { status: 400 })
  if (userId === adminId) return NextResponse.json({ error: "Can't modify your own account here" }, { status: 400 })

  if (action === 'set_topics') {
    const topics = Array.isArray(body.topics) ? body.topics.map((t: any) => String(t).trim()).filter(Boolean) : []
    const svc = await createServiceClient()
    const { error } = await svc.from('business_profiles').update({ topics }).eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const update: Record<string, any> = {}
  if (action === 'set_plan') {
    update.plan = String(body.plan)
  } else if (action === 'set_expiry') {
    update.plan_expires_at = body.plan_expires_at ? new Date(body.plan_expires_at).toISOString() : null
  } else if (action === 'suspend') {
    update.is_suspended = Boolean(body.is_suspended)
  } else if (action === 'set_credits') {
    update.credits_balance = Math.max(0, Math.trunc(Number(body.credits_balance) || 0))
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service.from('profiles').update(update).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
