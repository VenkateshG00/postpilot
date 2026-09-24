export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const N8N_PUBLISH_WEBHOOK_URL = process.env.N8N_PUBLISH_WEBHOOK_URL

// Publishes a ready one-off post via the n8n "Publish ready post" webhook.
export async function POST(req: NextRequest) {
  if (!N8N_PUBLISH_WEBHOOK_URL) return NextResponse.json({ error: 'Publishing is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const accountId = String(body.account_id ?? '')
  const caption = String(body.caption ?? '')
  const image_url = String(body.image_url ?? '')
  const topic = String(body.topic ?? 'Custom post')
  if (!accountId || !image_url || !caption) return NextResponse.json({ error: 'Missing post content' }, { status: 400 })

  const { data: acct } = await supabase.from('social_accounts')
    .select('id, ig_business_id, access_token').eq('id', accountId).eq('user_id', user.id).maybeSingle()
  if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const svc = await createServiceClient()
  const { data: log, error: logErr } = await svc.from('post_logs').insert({
    user_id: user.id, social_account_id: accountId, platform: 'instagram',
    status: 'pending', image_url, caption, topic_used: topic, scheduled_for: new Date().toISOString(),
  }).select('id').single()
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  try {
    await fetch(N8N_PUBLISH_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, caption, ig_business_id: acct.ig_business_id, access_token: acct.access_token, post_log_id: log.id }),
    })
  } catch {
    await svc.from('post_logs').update({ status: 'failed', error_message: 'Publish webhook unreachable' }).eq('id', log.id)
    return NextResponse.json({ error: 'Publish failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, post_log_id: log.id })
}
