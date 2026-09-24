export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import ApprovalsClient from './ApprovalsClient'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: logs } = await supabase.from('post_logs')
    .select('id, image_url, caption, topic_used, created_at, social_accounts(account_name)')
    .eq('user_id', user!.id).eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
  const { data: profile } = await supabase.from('profiles').select('credits_balance').eq('id', user!.id).maybeSingle()
  const posts = (logs ?? []).map((l: any) => ({
    id: l.id, image_url: l.image_url, caption: l.caption, topic_used: l.topic_used,
    created_at: l.created_at, account_name: l.social_accounts?.account_name ?? '',
  }))
  return <ApprovalsClient posts={posts} credits={profile?.credits_balance ?? 0} />
}
