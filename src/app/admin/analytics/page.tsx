export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'
import AdminAnalyticsClient from './AdminAnalyticsClient'

const IST = 5.5 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
function istParts(ts: string) {
  const d = new Date(new Date(ts).getTime() + IST)
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
}

export default async function AdminAnalyticsPage() {
  const { service } = await requireAdminServer()

  const [{ data: profiles }, { data: logs }, { data: accounts }, { data: plans }, { data: bizs }] = await Promise.all([
    service.from('profiles').select('id, email, plan, plan_expires_at, credits_balance, created_at').eq('is_admin', false),
    service.from('post_logs').select('user_id, status, platform, created_at, published_at').order('created_at', { ascending: false }).limit(5000),
    service.from('social_accounts').select('id, platform'),
    service.from('plans').select('key, price_inr'),
    service.from('business_profiles').select('user_id, business_name'),
  ])

  const users = profiles ?? []
  const rows = logs ?? []
  const now = Date.now()
  const priceByKey: Record<string, number> = {}
  ;(plans ?? []).forEach((p: any) => { priceByKey[p.key] = p.price_inr })
  const bizByUser: Record<string, string> = {}
  ;(bizs ?? []).forEach((b: any) => { bizByUser[b.user_id] = b.business_name })

  // KPIs
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  const mrrByPlanMap: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  let activePaid = 0, mrr = 0, creditsOut = 0, new30 = 0
  for (const u of users) {
    planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1
    creditsOut += u.credits_balance ?? 0
    if (new Date(u.created_at).getTime() >= now - 30 * DAY) new30++
    const notExpired = !u.plan_expires_at || new Date(u.plan_expires_at).getTime() > now
    if (u.plan !== 'free' && notExpired) { activePaid++; mrr += priceByKey[u.plan] ?? 0; mrrByPlanMap[u.plan] = (mrrByPlanMap[u.plan] ?? 0) + (priceByKey[u.plan] ?? 0) }
  }

  const published = rows.filter(r => r.status === 'published').length
  const failed = rows.filter(r => r.status === 'failed').length
  const pending = rows.filter(r => r.status !== 'published' && r.status !== 'failed').length
  const decided = published + failed
  const successRate = decided > 0 ? Math.round((published / decided) * 100) : null

  // Daily signups + daily posts (30 IST days)
  const todayIST = new Date(now + IST)
  const dayKeys: string[] = []
  const signupMap: Record<string, number> = {}
  const postMap: Record<string, { date: string; published: number; failed: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const key = new Date(todayIST.getTime() - i * DAY).toISOString().slice(0, 10)
    dayKeys.push(key); signupMap[key] = 0; postMap[key] = { date: key, published: 0, failed: 0 }
  }
  for (const u of users) { const { date } = istParts(u.created_at); if (signupMap[date] !== undefined) signupMap[date]++ }
  for (const r of rows) {
    const { date } = istParts(r.created_at); const b = postMap[date]; if (!b) continue
    if (r.status === 'published') b.published++; else if (r.status === 'failed') b.failed++
  }
  const signups = dayKeys.map(k => ({ date: k, count: signupMap[k] }))
  const postsDaily = dayKeys.map(k => postMap[k])

  // Best hours (published, IST)
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const r of rows) { if (r.status !== 'published') continue; const { hour } = istParts(r.published_at || r.created_at); byHour[hour].count++ }

  // Platform mix (posts)
  const platMap: Record<string, number> = {}
  for (const r of rows) { const p = r.platform || 'instagram'; platMap[p] = (platMap[p] ?? 0) + 1 }
  const platforms = Object.entries(platMap).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count)

  // Top clients by published posts
  const pubByUser: Record<string, number> = {}
  for (const r of rows) if (r.status === 'published') pubByUser[r.user_id] = (pubByUser[r.user_id] ?? 0) + 1
  const emailByUser: Record<string, string> = {}
  users.forEach(u => { emailByUser[u.id] = u.email })
  const topClients = Object.entries(pubByUser)
    .map(([uid, count]) => ({ name: bizByUser[uid] ?? emailByUser[uid] ?? '—', count }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  return (
    <AdminAnalyticsClient
      kpis={{
        totalUsers: users.length, new30, activePaid, mrr, creditsOut,
        totalChannels: (accounts ?? []).length, totalPosts: rows.length, successRate,
      }}
      planCounts={planCounts}
      mrrByPlan={mrrByPlanMap}
      signups={signups}
      postsDaily={postsDaily}
      byHour={byHour}
      platforms={platforms}
      topClients={topClients}
      delivery={{ published, failed, pending, successRate: successRate ?? 0 }}
    />
  )
}
