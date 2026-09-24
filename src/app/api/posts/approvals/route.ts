export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generatePost } from '@/lib/generate'

const N8N_PUBLISH_WEBHOOK_URL = process.env.N8N_PUBLISH_WEBHOOK_URL

// Approve / Regenerate / Discard a post held for approval.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const id = String(body.post_log_id ?? '')
  const action = String(body.action ?? '')
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })

  const svc = await createServiceClient()
  const { data: log } = await svc.from('post_logs')
    .select('id, user_id, social_account_id, image_url, caption, topic_used, status')
    .eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!log || log.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Post not found or not awaiting approval' }, { status: 404 })
  }

  if (action === 'discard') {
    await svc.from('post_logs').update({ status: 'discarded' }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'regenerate') {
    const { data: newBal } = await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: 1 })
    if (newBal === null || newBal === undefined) return NextResponse.json({ error: 'Out of credits — add credits or upgrade' }, { status: 402 })
    const { data: biz } = await svc.from('business_profiles')
      .select('business_name, industry, brand_voice, target_audience').eq('user_id', user.id).maybeSingle()
    const gen = await generatePost(log.topic_used || biz?.industry || 'update', biz || {})
    if (!gen) { await svc.rpc('spend_credits', { p_user_id: user.id, p_amount: -1 }); return NextResponse.json({ error: 'Generation failed, try again' }, { status: 502 }) }
    await svc.from('post_logs').update({ image_url: gen.image_url, caption: gen.caption }).eq('id', id)
    return NextResponse.json({ ok: true, caption: gen.caption, image_url: gen.image_url, credits_left: newBal })
  }

  if (action === 'approve') {
    if (!N8N_PUBLISH_WEBHOOK_URL) return NextResponse.json({ error: 'Publishing is not configured' }, { status: 500 })
    const { data: acct } = await svc.from('social_accounts')
      .select('ig_business_id, access_token').eq('id', log.social_account_id).maybeSingle()
    if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    await svc.from('post_logs').update({ status: 'pending' }).eq('id', id)
    try {
      await fetch(N8N_PUBLISH_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: log.image_url, caption: log.caption, ig_business_id: acct.ig_business_id, access_token: acct.access_token, post_log_id: id }),
      })
    } catch {
      await svc.from('post_logs').update({ status: 'failed', error_message: 'Publish webhook unreachable' }).eq('id', id)
      return NextResponse.json({ error: 'Publish failed' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
