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

  const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', user!.id).maybeSingle()
  const expired = !!profile?.plan_expires_at && new Date(profile.plan_expires_at).getTime() < Date.now()
  const eff = expired ? 'free' : (profile?.plan || 'free')
  const eligible = ['trial', 'pro', 'agency'].includes(eff)

  return <ConnectPageClient accounts={accounts ?? []} eligible={eligible} />
}
