export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { getActiveAccountId } from '@/lib/active-account'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accts } = await supabase
    .from('social_accounts')
    .select('id, account_name')
    .eq('user_id', user!.id)
    .eq('is_active', true)

  const activeId = await getActiveAccountId((accts ?? []).map(a => a.id))

  // Fetch 3 months of posts centred on today (prev + current + next) so client-side
  // month navigation doesn't need another server round-trip for normal use.
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const to   = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString()

  let q = supabase
    .from('post_logs')
    .select('id, caption, image_url, topic_used, status, content_type, scheduled_for, published_at, created_at, ig_permalink, social_account_id')
    .eq('user_id', user!.id)
    .in('status', ['published', 'scheduled', 'pending', 'failed'])

  if (activeId) q = q.eq('social_account_id', activeId)

  // Filter by the relevant date column for each status
  const { data: posts } = await q
    .or(`scheduled_for.gte.${from},published_at.gte.${from}`)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .limit(300)

  return (
    <CalendarClient
      posts={posts ?? []}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  )
}
