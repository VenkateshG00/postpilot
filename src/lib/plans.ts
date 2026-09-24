// Central plan definitions (FALLBACK). The live source of truth is the
// `plans` table in Supabase, read via lib/plans-db.ts. These values mirror it
// so the app still works if a DB read fails. Plan KEYS (free/starter/pro/agency)
// match the CHECK constraint on profiles.plan — do not rename them.

export type PlanKey = 'free' | 'trial' | 'starter' | 'pro' | 'agency'

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
    features: ['1 post per day', '1 channel', 'AI captions + stock images'],
  },
  trial: {
    key: 'trial', label: 'Free Trial', priceInr: 0, postsPerDay: 5,
    features: ['7-day free trial', '5 posts per day', 'Full Pro features'],
  },
  starter: {
    key: 'starter', label: 'Starter', priceInr: 499, postsPerDay: 2,
    features: ['2 posts per day', '1 channel', '90 AI credits / mo', '7-day free trial'],
  },
  pro: {
    key: 'pro', label: 'Pro', priceInr: 1299, postsPerDay: 5,
    features: ['5 posts per day', '3 channels', 'Pexels + DALL-E images', '300 AI credits / mo', 'Analytics'],
  },
  agency: {
    key: 'agency', label: 'Agency', priceInr: 4999, postsPerDay: Infinity,
    features: ['Unlimited posts', '10 channels', '2,000 AI credits / mo', '4 team seats', 'White-label + client reports'],
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
