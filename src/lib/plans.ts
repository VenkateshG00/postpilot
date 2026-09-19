// Central plan definitions. Plan KEYS (free/starter/pro/agency) match the
// CHECK constraint on profiles.plan — do not rename them.

export type PlanKey = 'free' | 'starter' | 'pro' | 'agency'

export interface PlanDef {
  key: PlanKey
  label: string
  priceInr: number          // monthly price in rupees (0 = free)
  postsPerDay: number       // Infinity = unlimited
  features: string[]
}

export const PLANS: Record<PlanKey, PlanDef> = {
  free: {
    key: 'free', label: 'Free', priceInr: 0, postsPerDay: 1,
    features: ['1 post per day', '1 Instagram account', 'AI captions + images'],
  },
  starter: {
    key: 'starter', label: 'Starter', priceInr: 499, postsPerDay: 3,
    features: ['3 posts per day', '1 Instagram account', 'Priority scheduling'],
  },
  pro: {
    key: 'pro', label: 'Pro', priceInr: 1499, postsPerDay: 10,
    features: ['10 posts per day', 'Multiple accounts', 'Analytics dashboard'],
  },
  agency: {
    key: 'agency', label: 'Agency', priceInr: 4999, postsPerDay: Infinity,
    features: ['Unlimited posts', 'Unlimited accounts', 'White-label + client reporting'],
  },
}

export const PLAN_ORDER: PlanKey[] = ['free', 'starter', 'pro', 'agency']

// Access granted per paid month.
export const ACCESS_DAYS = 30

export function dailyLimit(plan: string): number {
  return (PLANS as Record<string, PlanDef>)[plan]?.postsPerDay ?? PLANS.free.postsPerDay
}

export function isUnlimited(plan: string): boolean {
  return (PLANS as Record<string, PlanDef>)[plan]?.postsPerDay === Infinity
}

export function limitLabel(plan: string): string {
  const n = dailyLimit(plan)
  return n === Infinity ? 'Unlimited' : `${n}/day`
}

// Amount in paise for a plan's one-time monthly payment.
export function amountPaise(plan: PlanKey): number {
  return (PLANS[plan]?.priceInr ?? 0) * 100
}
