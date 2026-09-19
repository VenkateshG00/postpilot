export const runtime = 'edge'
import { NextResponse } from 'next/server'
// Deprecated: billing moved to one-time Orders. See /api/razorpay/order.
export async function POST() {
  return NextResponse.json({ error: 'Deprecated endpoint' }, { status: 410 })
}
