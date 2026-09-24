export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { PLANS, ACCESS_DAYS, type PlanKey } from '@/lib/plans'

type Service = Awaited<ReturnType<typeof createServiceClient>>

// Backup grant path for production (the verify route already grants on the
// client return; this covers cases where the browser closed before verify).
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await req.text()
  const ok = await verifyWebhookSignature(body, signature)
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  const event = JSON.parse(body)
  const service: Service = await createServiceClient()

  try {
    if (event.event === 'payment.captured') {
      const payment = event?.payload?.payment?.entity
      const paymentId: string | undefined = payment?.id
      const userId: string | undefined = payment?.notes?.user_id
      const plan = payment?.notes?.plan as PlanKey | undefined

      if (paymentId && userId && plan && plan !== 'free' && plan !== 'trial' && PLANS[plan]) {
        // Idempotency: one grant per payment id (shared with the verify route).
        const { data: seen } = await service.from('billing_events').select('id').eq('id', paymentId).maybeSingle()
        if (seen) return NextResponse.json({ received: true, duplicate: true })

        const periodEnd = new Date(Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString()
        await service.from('profiles').update({
          plan,
          subscription_status: 'active',
          current_period_end: periodEnd,
          plan_expires_at: periodEnd,
        }).eq('id', userId)

        await service.from('billing_events').insert({
          id: paymentId,
          type: 'payment.captured',
          user_id: userId,
          payload: { plan, source: 'webhook' },
        })
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
