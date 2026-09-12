import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: biz }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('business_profiles').select('*').eq('user_id', user!.id).single()
  ])
  return <SettingsClient profile={profile} biz={biz} />
}
