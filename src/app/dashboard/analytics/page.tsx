export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from './AnalyticsClient'
import { getActiveAccountId } from '@/lib/active-account'

const IST = 5.5 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

// IST calendar date (YYYY-MM-DD) and hour (0-23) for a UTC timestamp.
function istParts(ts: string) {
  const d = new Date(new Date(ts).getTime() + IST)
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
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
    .select('status, platform, social_account_id, created_at, published_at')
    .eq('user_id', user!.id)
  if (activeId) logsQ = logsQ.eq('social_account_id', activeId)
  const { data: logs } = await logsQ.order('created_at', { ascending: false }).limit(2000)

  const rows = logs ?? []
  const now = Date.now()

  // Totals
  const published = rows.filter((r) => r.status === 'published').length
  const failed = rows.filter((r) => r.status === 'failed').length
  const pending = rows.filter((r) => r.status !== 'published' && r.status !== 'failed').length
  const decided = published + failed
  const successRate = decided > 0 ? Math.round((published / decided) * 100) : null

  const last7 = rows.filter((r) => r.status === 'published' && new Date(r.created_at).getTime() >= now - 7 * DAY).length
  const last30 = rows.filter((r) => r.status === 'published' && new Date(r.created_at).getTime() >= now - 30 * DAY).length

  // Daily (last 30 IST days), published vs failed
  const todayIST = new Date(now + IST)
  const dayMap: Record<string, { date: string; published: number; failed: number }> = {}
  const dayKeys: string[] = []
  for (let i = 29; i >= 0; i--) {
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

  // Best posting times: published posts by IST hour
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const r of rows) {
    if (r.status !== 'published') continue
    const { hour } = istParts(r.published_at || r.created_at)
    byHour[hour].count++
  }

  // Per account
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

  // CSV rows (IST date/time, status, platform, account)
  const csvRows = rows.slice(0, 2000).map((r) => {
    const d = new Date(new Date(r.created_at).getTime() + IST)
    return {
      datetime: d.toISOString().slice(0, 16).replace('T', ' '),
      status: r.status,
      platform: r.platform || 'instagram',
      account: nameById[r.social_account_id || ''] || '',
    }
  })

  return (
    <AnalyticsClient
      kpis={{ published, failed, pending, successRate, last7, last30, total: rows.length }}
      daily={daily}
      byHour={byHour}
      perAccount={perAccount}
      csvRows={csvRows}
    />
  )
}
