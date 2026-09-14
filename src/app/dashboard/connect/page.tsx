export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import ConnectPageClient from './ConnectPageClient'

export default async function ConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user!.id)
    .order('connected_at', { ascending: false })

  return <ConnectPageClient accounts={accounts ?? []} />
}
