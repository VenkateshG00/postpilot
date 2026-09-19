export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { PLANS, PLAN_ORDER } from '@/lib/plans'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, subscription_status')
    .eq('id', user!.id)
    .single()

  const { data: usage } = await supabase.rpc('posts_today', { p_user_id: user!.id })
  const postsToday = typeof usage === 'number' ? usage : 0

  const currentKey = (profile?.plan as keyof typeof PLANS) ?? 'free'
  const currentLimit = PLANS[currentKey].postsPerDay

  const plans = PLAN_ORDER.map((k) => {
    const p = PLANS[k]
    return {
      key: p.key,
      label: p.label,
      priceInr: p.priceInr,
      limitLabel: p.postsPerDay === Infinity ? 'Unlimited' : `${p.postsPerDay}/day`,
      features: p.features,
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
    />
  )
}
