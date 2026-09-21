export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { PLANS, PLAN_ORDER } from '@/lib/plans'
import { getPlans } from '@/lib/plans-db'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, subscription_status, credits_balance')
    .eq('id', user!.id)
    .single()

  const { data: usage } = await supabase.rpc('posts_today', { p_user_id: user!.id })
  const postsToday = typeof usage === 'number' ? usage : 0

  // Live plan config from the DB (falls back to lib/plans.ts if unavailable).
  const dbPlans = await getPlans()
  const currentKey = (profile?.plan as keyof typeof PLANS) ?? 'free'
  const currentRow = dbPlans[currentKey] ?? dbPlans['free']
  const currentLimit = currentRow?.posts_per_day == null ? Infinity : currentRow.posts_per_day

  // Price + limit come from the DB; marketing feature bullets stay as copy.
  const plans = PLAN_ORDER.map((k) => {
    const row = dbPlans[k]
    const copy = PLANS[k]
    const ppd = row?.posts_per_day
    return {
      key: k,
      label: row?.name ?? copy.label,
      priceInr: row?.price_inr ?? copy.priceInr,
      limitLabel: ppd == null ? 'Unlimited' : `${ppd}/day`,
      features: copy.features,
    }
  })

  return (
    <BillingClient
      plans={plans}
      currentPlan={currentKey}
      currentLimitLabel={currentLimit === Infinity ? 'Unlimited' : `${currentLimit}/day`}
      dailyLimit={currentLimit === Infinity ? null : currentLimit}
      postsToday={postsToday}
      planExpiresAt={profile?.plan_expires_at ?? null}
      creditsBalance={profile?.credits_balance ?? 0}
      creditsMonthly={currentRow?.credits_per_month ?? 0}
    />
  )
}
