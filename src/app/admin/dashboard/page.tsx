export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'

export default async function AdminDashboard() {
  const { service } = await requireAdminServer()

  const [{ data: users }, { data: plans }, { data: posts }] = await Promise.all([
    service.from('profiles').select('plan, plan_expires_at').eq('is_admin', false),
    service.from('plans').select('key, price_inr'),
    service.from('post_logs').select('status, created_at'),
  ])

  const now = Date.now()
  const priceByKey: Record<string, number> = {}
  ;(plans ?? []).forEach((p: any) => { priceByKey[p.key] = p.price_inr })

  const nonAdmin = users ?? []
  const counts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  let activePaid = 0
  let mrr = 0
  for (const u of nonAdmin) {
    counts[u.plan] = (counts[u.plan] ?? 0) + 1
    const notExpired = !u.plan_expires_at || new Date(u.plan_expires_at).getTime() > now
    if (u.plan !== 'free' && u.plan !== 'trial' && notExpired) { activePaid++; mrr += priceByKey[u.plan] ?? 0 }
  }

  const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0)
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  let publishedThisMonth = 0, failedRecent = 0
  for (const p of (posts ?? [])) {
    const t = new Date(p.created_at).getTime()
    if (p.status === 'published' && t >= som.getTime()) publishedThisMonth++
    if (p.status === 'failed' && t >= weekAgo) failedRecent++
  }

  const tiles = [
    { label: 'Total users', value: String(nonAdmin.length) },
    { label: 'Active paid subs', value: String(activePaid) },
    { label: 'Est. MRR', value: `₹${mrr.toLocaleString('en-IN')}` },
    { label: 'Posts this month', value: String(publishedThisMonth) },
    { label: 'Failed (7d)', value: String(failedRecent) },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {tiles.map(t => (
          <div key={t.label} className="card p-5">
            <p className="text-2xl font-semibold text-gray-900">{t.value}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-medium text-gray-900 mb-4">Subscribers by plan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['free', 'starter', 'pro', 'agency'] as const).map(k => (
            <div key={k}>
              <p className="text-xl font-semibold text-gray-900">{counts[k] ?? 0}</p>
              <p className="text-xs text-gray-500 capitalize">{k}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
