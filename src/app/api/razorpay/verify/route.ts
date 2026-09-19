export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rzpFetch, verifyPaymentSignature } from '@/lib/razorpay'
import { PLANS, ACCESS_DAYS, type PlanKey } from '@/lib/plans'

// Called by the browser right after a successful Checkout. Verifies the
// payment signature and grants the plan immediately (so it works even
// without a public webhook URL, e.g. local testing). Idempotent per payment.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const ok = await verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  const service = await createServiceClient()

  // Idempotency: one grant per payment id.
  const { data: seen } = await service.from('billing_events').select('id').eq('id', razorpay_payment_id).maybeSingle()
  if (seen) return NextResponse.json({ verified: true, already: true })

  // Resolve the plan from the order's notes (server-trusted, not the client).
  const order = await rzpFetch(`/orders/${razorpay_order_id}`)
  const plan = order?.notes?.plan as PlanKey | undefined
  if (!plan || plan === 'free' || !PLANS[plan]) {
    return NextResponse.json({ error: 'Unknown plan on order' }, { status: 400 })
  }

  const periodEnd = new Date(Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await service.from('profiles').update({
    plan,
    subscription_status: 'active',
    current_period_end: periodEnd,
    plan_expires_at: periodEnd,
  }).eq('id', user.id)

  await service.from('billing_events').insert({
    id: razorpay_payment_id,
    type: 'payment.captured',
    user_id: user.id,
    payload: { order_id: razorpay_order_id, plan, source: 'verify' },
  })

  return NextResponse.json({ verified: true, plan })
}
