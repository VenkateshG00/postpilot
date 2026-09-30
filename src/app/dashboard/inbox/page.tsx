export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import InboxClient from './InboxClient'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: conversations }] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('id, account_name, platform, profile_picture_url')
      .eq('user_id', user!.id)
      .eq('is_active', true),
    supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user!.id)
      .order('last_message_at', { ascending: false })
      .limit(50),
  ])

  return (
    <InboxClient
      accounts={accounts ?? []}
      initialConversations={conversations ?? []}
    />
  )
}
