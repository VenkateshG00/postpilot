export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const IG_API = 'https://graph.facebook.com/v21.0'
// Only re-sync posts whose metrics are older than this.
const STALE_HOURS = 6
const MAX_POSTS_PER_SYNC = 50 // cap to stay well under IG rate limits
const CONCURRENCY = 5         // parallel IG API calls at a time

interface PostRow {
  id: string
  ig_media_id: string
  social_account_id: string
  metrics_fetched_at: string | null
}

interface AccountRow {
  id: string
  access_token: string
}

// Fetch like_count + comments_count from the media object.
async function fetchMediaCounts(
  mediaId: string,
  token: string,
): Promise<{ likes: number; comments: number } | null> {
  try {
    const r = await fetch(
      `${IG_API}/${mediaId}?fields=like_count,comments_count&access_token=${token}`,
    )
    if (!r.ok) return null
    const d = await r.json() as { like_count?: number; comments_count?: number }
    return { likes: d.like_count ?? 0, comments: d.comments_count ?? 0 }
  } catch {
    return null
  }
}

// Fetch reach, impressions, and saves from the media insights endpoint.
async function fetchInsights(
  mediaId: string,
  token: string,
): Promise<{ reach: number; impressions: number; saves: number } | null> {
  try {
    const r = await fetch(
      `${IG_API}/${mediaId}/insights?metric=impressions,reach,saved&access_token=${token}`,
    )
    if (!r.ok) return null
    const d = await r.json() as { data?: { name: string; values?: { value: number }[] }[] }
    const byName: Record<string, number> = {}
    for (const item of d.data ?? []) {
      byName[item.name] = item.values?.[0]?.value ?? 0
    }
    return {
      impressions: byName['impressions'] ?? 0,
      reach: byName['reach'] ?? 0,
      saves: byName['saved'] ?? 0,
    }
  } catch {
    return null
  }
}

// Processes posts in batches of CONCURRENCY to avoid overwhelming the IG API.
async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    results.push(...await Promise.all(batch.map(fn)))
  }
  return results
}

// GET /api/analytics/sync — refreshes engagement metrics for published posts.
// Safe to call on every analytics page load; stale guard prevents excess IG API calls.
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

  // Published posts that have a media ID and haven't been refreshed recently.
  const { data: posts, error: postsErr } = await supabase
    .from('post_logs')
    .select('id, ig_media_id, social_account_id, metrics_fetched_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('ig_media_id', 'is', null)
    .or(`metrics_fetched_at.is.null,metrics_fetched_at.lt.${staleThreshold}`)
    .order('published_at', { ascending: false })
    .limit(MAX_POSTS_PER_SYNC)

  if (postsErr) return NextResponse.json({ error: postsErr.message }, { status: 500 })
  if (!posts || posts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'Nothing to sync' })
  }

  // Load the relevant access tokens once.
  const accountIds = [...new Set((posts as PostRow[]).map(p => p.social_account_id))]
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, access_token')
    .in('id', accountIds)
  const tokenById: Record<string, string> = {}
  for (const a of (accounts as AccountRow[] ?? [])) tokenById[a.id] = a.access_token

  const svc = await createServiceClient()
  let synced = 0

  await processInBatches(posts as PostRow[], async (post) => {
    const token = tokenById[post.social_account_id]
    if (!token) return

    // Fetch in parallel.
    const [counts, insights] = await Promise.all([
      fetchMediaCounts(post.ig_media_id, token),
      fetchInsights(post.ig_media_id, token),
    ])

    // Only update if we got at least something useful.
    if (!counts && !insights) return

    const patch: Record<string, number | string> = {
      metrics_fetched_at: new Date().toISOString(),
    }
    if (counts) {
      patch.likes_count = counts.likes
      patch.comments_count = counts.comments
    }
    if (insights) {
      patch.reach = insights.reach
      patch.impressions = insights.impressions
      patch.saves = insights.saves
    }

    await svc.from('post_logs').update(patch).eq('id', post.id)
    synced++
  }, CONCURRENCY)

  return NextResponse.json({ synced, total: posts.length })
}
