// Live plan config, read from the Supabase `plans` table (editable by the Super
// Admin), with a fallback to the hardcoded lib/plans.ts so posting and billing
// never hard-fail if a DB read hiccups. Edge-safe (fetch + service key).
import { PLANS, type PlanKey } from './plans'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface PlanRow {
  key: string
  name: string
  price_inr: number
  channels_included: number
  posts_per_day: number | null   // null = unlimited
  credits_per_month: number
  seats_included: number
  allow_dalle: boolean
  white_label: boolean
  trial_days: number
  analytics_level: string
  extra_channel_price: number
  extra_seat_price: number
  is_active: boolean
  sort_order: number
}

function fallbackPlans(): Record<string, PlanRow> {
  const out: Record<string, PlanRow> = {}
  for (const k of Object.keys(PLANS) as PlanKey[]) {
    const p = PLANS[k]
    out[k] = {
      key: k, name: p.label, price_inr: p.priceInr,
      channels_included: 1,
      posts_per_day: p.postsPerDay === Infinity ? null : p.postsPerDay,
      credits_per_month: 0, seats_included: 1, allow_dalle: false,
      white_label: false, trial_days: 0, analytics_level: 'basic',
      extra_channel_price: 0, extra_seat_price: 0, is_active: true, sort_order: 0,
    }
  }
  return out
}

let _cache: { at: number; plans: Record<string, PlanRow> } | null = null
const TTL_MS = 60_000

export async function getPlans(): Promise<Record<string, PlanRow>> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.plans
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/plans?select=*`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    if (!res.ok) throw new Error(`plans fetch ${res.status}`)
    const rows = (await res.json()) as PlanRow[]
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('no plan rows')
    const map: Record<string, PlanRow> = {}
    for (const r of rows) map[r.key] = r
    _cache = { at: Date.now(), plans: map }
    return map
  } catch (e) {
    console.error('[plans-db] falling back to hardcoded plans:', e)
    return fallbackPlans()
  }
}

export async function getPlan(key: string): Promise<PlanRow> {
  const plans = await getPlans()
  return plans[key] ?? plans['free'] ?? fallbackPlans()['free']
}

export async function dailyLimit(plan: string): Promise<number> {
  const p = await getPlan(plan)
  return p.posts_per_day == null ? Infinity : p.posts_per_day
}

export async function isUnlimited(plan: string): Promise<boolean> {
  const p = await getPlan(plan)
  return p.posts_per_day == null
}

export async function amountPaise(plan: string): Promise<number> {
  const p = await getPlan(plan)
  return (p.price_inr ?? 0) * 100
}
