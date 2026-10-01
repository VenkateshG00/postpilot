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

  // Try fetching with content_type first; if the column doesn't exist yet,
  // fall back to fetching without it so the calendar still renders posts.
  const baseFields = 'id, caption, image_url, topic_used, status, scheduled_for, published_at, created_at, ig_permalink, social_account_id'
  const fieldsWithType = baseFields + ', content_type'

  async function fetchPosts(fields: string) {
    let q = supabase
      .from('post_logs')
      .select(fields)
      .eq('user_id', user!.id)
      .in('status', ['published', 'scheduled', 'pending', 'failed', 'pending_approval'])

    if (activeId) q = q.eq('social_account_id', activeId)

    return q
      .or(`and(scheduled_for.not.is.null,scheduled_for.gte.${from}),and(published_at.not.is.null,published_at.gte.${from})`)
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .limit(300)
  }

  const firstTry = await fetchPosts(fieldsWithType)
  let posts: any[] = firstTry.data ?? []

  // If the query failed (e.g. content_type column doesn't exist), retry without it
  if (firstTry.error || firstTry.data === null) {
    const fallback = await fetchPosts(baseFields)
    posts = fallback.data ?? []
  }

  return (
    <CalendarClient
      posts={posts}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  )
}
