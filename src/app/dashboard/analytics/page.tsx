export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from './AnalyticsClient'
import { getActiveAccountId } from '@/lib/active-account'

const IST = 5.5 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

function istParts(ts: string) {
  const d = new Date(new Date(ts).getTime() + IST)
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), day: d.getUTCDay() }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, account_name, platform')
    .eq('user_id', user!.id)
  const activeId = await getActiveAccountId((accounts ?? []).map(a => a.id))

  let logsQ = supabase
    .from('post_logs')
    .select('id, status, platform, social_account_id, created_at, published_at, caption, image_url, ig_permalink, ig_media_id, topic_used, content_type, likes_count, comments_count, reach, impressions, saves, metrics_fetched_at')
    .eq('user_id', user!.id)
  if (activeId) logsQ = logsQ.eq('social_account_id', activeId)
  const { data: logs } = await logsQ.order('created_at', { ascending: false }).limit(2000)

  const rows = logs ?? []
  const now = Date.now()
  const todayIST = new Date(now + IST)

  // ── Delivery KPIs ──────────────────────────────────────────
  const published = rows.filter((r) => r.status === 'published').length
  const failed = rows.filter((r) => r.status === 'failed').length
  const pending = rows.filter((r) => r.status !== 'published' && r.status !== 'failed').length
  const decided = published + failed
  const successRate = decided > 0 ? Math.round((published / decided) * 100) : null

  // ── Engagement KPIs ────────────────────────────────────────
  const pubRows = rows.filter((r) => r.status === 'published')
  const withMetrics = pubRows.filter((r) => r.metrics_fetched_at)
  const totalReach = withMetrics.reduce((s, r) => s + (r.reach ?? 0), 0)
  const totalLikes = withMetrics.reduce((s, r) => s + (r.likes_count ?? 0), 0)
  const totalComments = withMetrics.reduce((s, r) => s + (r.comments_count ?? 0), 0)
  const totalSaves = withMetrics.reduce((s, r) => s + (r.saves ?? 0), 0)
  const totalImpressions = withMetrics.reduce((s, r) => s + (r.impressions ?? 0), 0)

  // ── Daily chart (last 90 days for flexibility) ──────────────
  const dayMap: Record<string, { date: string; published: number; failed: number }> = {}
  const dayKeys: string[] = []
  for (let i = 89; i >= 0; i--) {
    const key = new Date(todayIST.getTime() - i * DAY).toISOString().slice(0, 10)
    dayMap[key] = { date: key, published: 0, failed: 0 }
    dayKeys.push(key)
  }
  for (const r of rows) {
    const { date } = istParts(r.created_at)
    const bucket = dayMap[date]
    if (!bucket) continue
    if (r.status === 'published') bucket.published++
    else if (r.status === 'failed') bucket.failed++
  }
  const daily = dayKeys.map((k) => dayMap[k])

  // ── Posts with all metrics for client-side analytics ─────────
  const postRows = pubRows.map((r) => ({
    id: r.id,
    caption: String(r.caption ?? ''),
    published_at: r.published_at || r.created_at,
    created_at: r.created_at,
    content_type: r.content_type ?? 'post',
    topic: r.topic_used ?? '',
    likes: r.likes_count ?? 0,
    comments: r.comments_count ?? 0,
    reach: r.reach ?? 0,
    impressions: r.impressions ?? 0,
    saves: r.saves ?? 0,
    ig_permalink: r.ig_permalink ?? null,
    image_url: r.image_url ?? null,
    ig_media_id: r.ig_media_id ?? null,
    has_metrics: !!r.metrics_fetched_at,
  }))

  // ── Posting time heatmap data (day × hour) ──────────────────
  const dayHourMap: Record<string, number> = {}
  for (const r of pubRows) {
    const { hour, day } = istParts(r.published_at || r.created_at)
    const key = `${day}-${hour}`
    dayHourMap[key] = (dayHourMap[key] ?? 0) + 1
  }

  // ── Per account ─────────────────────────────────────────────
  const nameById: Record<string, string> = {}
  for (const a of accounts ?? []) nameById[a.id] = a.account_name || 'Instagram account'
  const acctMap: Record<string, { name: string; published: number; failed: number; total: number }> = {}
  for (const r of rows) {
    const id = r.social_account_id || 'unknown'
    if (!acctMap[id]) acctMap[id] = { name: nameById[id] || 'Unknown account', published: 0, failed: 0, total: 0 }
    acctMap[id].total++
    if (r.status === 'published') acctMap[id].published++
    else if (r.status === 'failed') acctMap[id].failed++
  }
  const perAccount = Object.values(acctMap).sort((a, b) => b.total - a.total)

  return (
    <AnalyticsClient
      kpis={{ published, failed, pending, successRate, total: rows.length }}
      engagement={{ totalReach, totalLikes, totalComments, totalSaves, totalImpressions, postsWithData: withMetrics.length, hasEngagement: withMetrics.length > 0 }}
      daily={daily}
      dayHourMap={dayHourMap}
      perAccount={perAccount}
      postRows={postRows}
      activeAccountId={activeId}
    />
  )
}
