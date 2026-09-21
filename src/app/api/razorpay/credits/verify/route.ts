export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rzpFetch, verifyPaymentSignature } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const ok = await verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  const service = await createServiceClient()

  // Idempotency: one credit grant per payment id.
  const { data: seen } = await service.from('billing_events').select('id').eq('id', razorpay_payment_id).maybeSingle()
  if (seen) return NextResponse.json({ verified: true, already: true })

  // Trust the order's notes (set server-side at order time).
  const order = await rzpFetch(`/orders/${razorpay_order_id}`)
  if (order?.notes?.kind !== 'credits') return NextResponse.json({ error: 'Not a credits order' }, { status: 400 })
  const credits = parseInt(String(order?.notes?.credits ?? '0'), 10)
  if (!credits || credits < 0) return NextResponse.json({ error: 'Bad credits amount' }, { status: 400 })

  const { data: prof } = await service.from('profiles').select('credits_balance').eq('id', user.id).single()
  const newBalance = (prof?.credits_balance ?? 0) + credits
  await service.from('profiles').update({ credits_balance: newBalance }).eq('id', user.id)

  await service.from('billing_events').insert({
    id: razorpay_payment_id,
    type: 'credits.purchased',
    user_id: user.id,
    payload: { order_id: razorpay_order_id, pack: order?.notes?.pack, credits, source: 'credits-verify' },
  })

  return NextResponse.json({ verified: true, credits, balance: newBalance })
}
