import { createClient } from '@/lib/supabase/server'
import SchedulePageClient from './SchedulePageClient'

export default async function SchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: schedules }, { data: accounts }] = await Promise.all([
    supabase.from('schedules').select('*, social_accounts(account_name, platform)').eq('user_id', user!.id).order('created_at'),
    supabase.from('social_accounts').select('id, account_name, platform, ig_business_id').eq('user_id', user!.id).eq('is_active', true)
  ])

  return <SchedulePageClient schedules={schedules ?? []} accounts={accounts ?? []} />
}
