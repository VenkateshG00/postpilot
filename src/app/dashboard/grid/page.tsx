export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getActiveAccountId } from '@/lib/active-account'
import GridClient from './GridClient'

export default async function GridPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accts } = await supabase
    .from('social_accounts')
    .select('id, account_name')
    .eq('user_id', user!.id)
    .eq('is_active', true)

  const activeId = await getActiveAccountId((accts ?? []).map(a => a.id))

  let q = supabase
    .from('post_logs')
    .select('id, caption, image_url, status, scheduled_for, published_at, created_at')
    .eq('user_id', user!.id)
    .in('status', ['published', 'scheduled', 'pending'])

  if (activeId) q = q.eq('social_account_id', activeId)

  const { data: posts } = await q
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('scheduled_for', { ascending: false, nullsFirst: false })
    .limit(60)

  return (
    <GridClient
      posts={posts ?? []}
      accountName={accts?.find(a => a.id === activeId)?.account_name ?? accts?.[0]?.account_name ?? 'youraccount'}
    />
  )
}
