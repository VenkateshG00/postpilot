export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: biz }, { data: schedules }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('business_profiles').select('*').eq('user_id', user!.id).single(),
    supabase.from('schedules').select('*').eq('user_id', user!.id).eq('is_active', true),
  ])
  return <SettingsClient profile={profile} biz={biz} schedules={schedules} />
}
