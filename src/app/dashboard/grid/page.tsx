export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getActiveAccountId } from '@/lib/active-account'
import GridClient from './GridClient'

export default async function GridPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accts } = await supabase
    .from('social_accounts')
    .select('id, account_name, account_picture_url')
    .eq('user_id', user!.id)
    .eq('is_active', true)

  const activeId = await getActiveAccountId((accts ?? []).map(a => a.id))
  const activeAcct = accts?.find(a => a.id === activeId) ?? accts?.[0] ?? null

  let q = supabase
    .from('post_logs')
    .select('id, caption, image_url, status, scheduled_for, published_at, created_at, content_type, ig_media_id')
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
      accountName={activeAcct?.account_name ?? 'youraccount'}
      accountPicture={activeAcct?.account_picture_url ?? null}
      activeAccountId={activeId ?? null}
    />
  )
}
