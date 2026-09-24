export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rzpFetch } from '@/lib/razorpay'
import { PLANS, type PlanKey } from '@/lib/plans'
import { amountPaise } from '@/lib/plans-db'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let plan: PlanKey
  try {
    const body = await req.json() as { plan?: PlanKey }
    plan = body.plan as PlanKey
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!plan || plan === 'free' || plan === 'trial' || !PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const amount = await amountPaise(plan)
  let order: any
  try {
    order = await rzpFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        notes: { user_id: user.id, plan },
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Razorpay error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    plan,
  })
}
