export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import AutomationsClient from './AutomationsClient'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: automations }] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('id, account_name, platform, profile_picture_url')
      .eq('user_id', user!.id)
      .eq('is_active', true),
    supabase
      .from('automations')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <AutomationsClient
      accounts={accounts ?? []}
      initialAutomations={automations ?? []}
    />
  )
}
