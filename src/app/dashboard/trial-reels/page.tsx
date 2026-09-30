export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrialReelsClient from './TrialReelsClient'

export default async function TrialReelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* Fetch accounts */
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, account_name, platform')
    .eq('user_id', user.id)
    .eq('is_active', true)

  /* Fetch trial reels (is_trial = true) */
  const { data: trials } = await supabase
    .from('post_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_trial', true)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <TrialReelsClient
      accounts={accounts ?? []}
      trials={trials ?? []}
    />
  )
}
