export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/plans-db'
import WhiteLabelClient from './WhiteLabelClient'

export default async function WhiteLabelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('plan, brand_name, brand_logo_url, brand_color').eq('id', user!.id).single()
  const plan = await getPlan(profile?.plan ?? 'free')

  return (
    <WhiteLabelClient
      eligible={!!plan.white_label}
      planName={plan.name}
      brand={{
        name: profile?.brand_name ?? '',
        logo_url: profile?.brand_logo_url ?? '',
        color: profile?.brand_color ?? '',
      }}
    />
  )
}
