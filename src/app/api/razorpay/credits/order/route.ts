export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rzpFetch } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { pack?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const packName = String(body.pack ?? '')
  if (!packName) return NextResponse.json({ error: 'Missing pack' }, { status: 400 })

  // Price + credits come from the DB, never the client.
  const service = await createServiceClient()
  const { data: pack } = await service.from('credit_packs')
    .select('name, credits, price_inr, is_active').eq('name', packName).maybeSingle()
  if (!pack || !pack.is_active) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const amount = (pack.price_inr ?? 0) * 100
  let order: any
  try {
    order = await rzpFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        notes: { user_id: user.id, kind: 'credits', pack: pack.name, credits: String(pack.credits) },
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
    pack: pack.name,
    credits: pack.credits,
  })
}
