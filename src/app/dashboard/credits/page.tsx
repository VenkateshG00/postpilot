export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/plans-db'
import CreditsClient from './CreditsClient'

export default async function CreditsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('plan, credits_balance').eq('id', user!.id).single()
  const { data: packs } = await supabase
    .from('credit_packs').select('name, credits, price_inr').eq('is_active', true)
    .order('sort_order', { ascending: true })

  const plan = await getPlan(profile?.plan ?? 'free')

  return (
    <CreditsClient
      packs={packs ?? []}
      balance={profile?.credits_balance ?? 0}
      monthly={plan.credits_per_month ?? 0}
    />
  )
}
