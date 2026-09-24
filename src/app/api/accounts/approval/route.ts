export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED = ['trial', 'pro', 'agency']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const accountId = String(body.account_id ?? '')
  const requireApproval = !!body.require_approval
  if (!accountId) return NextResponse.json({ error: 'Missing account' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).maybeSingle()
  const expired = !!profile?.plan_expires_at && new Date(profile.plan_expires_at).getTime() < Date.now()
  const eff = expired ? 'free' : (profile?.plan || 'free')
  if (requireApproval && !ALLOWED.includes(eff)) {
    return NextResponse.json({ error: 'Approval queue is available on Pro and Agency plans' }, { status: 403 })
  }

  const svc = await createServiceClient()
  const { error } = await svc.from('social_accounts').update({ require_approval: requireApproval }).eq('id', accountId).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
