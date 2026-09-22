export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import SchedulePageClient from './SchedulePageClient'
import { getActiveAccountId } from '@/lib/active-account'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase.from('social_accounts').select('id, account_name, platform, ig_business_id').eq('user_id', user!.id).eq('is_active', true)
  const activeId = await getActiveAccountId((accounts ?? []).map(a => a.id))
  let sq = supabase.from('schedules').select('*, social_accounts(account_name, platform)').eq('user_id', user!.id)
  if (activeId) sq = sq.eq('social_account_id', activeId)
  const { data: schedules } = await sq.order('created_at')

  return <SchedulePageClient schedules={schedules ?? []} accounts={accounts ?? []} />
}
