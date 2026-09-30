export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getActiveAccountId } from '@/lib/active-account'
import PostsClient from './PostsClient'

export default async function PostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accts } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', user!.id)

  const activeId = await getActiveAccountId((accts ?? []).map(a => a.id))

  let q = supabase
    .from('post_logs')
    .select('*')
    .eq('user_id', user!.id)

  if (activeId) q = q.eq('social_account_id', activeId)

  const { data: logs } = await q
    .order('created_at', { ascending: false })
    .limit(100)

  return <PostsClient logs={logs ?? []} />
}
