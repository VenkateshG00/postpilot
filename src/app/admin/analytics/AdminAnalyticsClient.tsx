'use client'

import { Users, TrendingUp, IndianRupee, Coins, Instagram, CheckCircle2, XCircle, Clock, LayoutList } from 'lucide-react'

interface Props {
  kpis: { totalUsers: number; new30: number; activePaid: number; mrr: number; creditsOut: number; totalChannels: number; totalPosts: number; successRate: number | null }
  planCounts: Record<string, number>
  mrrByPlan: Record<string, number>
  signups: { date: string; count: number }[]
  postsDaily: { date: string; published: number; failed: number }[]
  byHour: { hour: number; count: number }[]
  platforms: { platform: string; count: number }[]
  topClients: { name: string; count: number }[]
  delivery: { published: number; failed: number; pending: number; successRate: number }
}

const EMERALD = '#10b981'
const RED = '#ef4444'
const BRAND = '#3355ff'
const PLAN_ORDER = ['free', 'starter', 'pro', 'agency']

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function AdminAnalyticsClient(props: Props) {
  const { kpis, planCounts, mrrByPlan, signups, postsDaily, byHour, platforms, topClients, delivery } = props

  const tiles = [
    { label: 'Total users', value: String(kpis.totalUsers), icon: Users, color: 'text-brand-600 bg-brand-50' },
    { label: 'New (30d)', value: String(kpis.new30), icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { label: 'Active paid', value: String(kpis.activePaid), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Est. MRR', value: inr(kpis.mrr), icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Credits outstanding', value: String(kpis.creditsOut), icon: Coins, color: 'text-amber-600 bg-amber-50' },
    { label: 'Channels', value: String(kpis.totalChannels), icon: Instagram, color: 'text-brand-600 bg-brand-50' },
    { label: 'Total posts', value: String(kpis.totalPosts), icon: LayoutList, color: 'text-gray-600 bg-gray-100' },
    { label: 'Success rate', value: kpis.successRate === null ? '—' : `${kpis.successRate}%`, icon: TrendingUp, color: 'text-brand-600 bg-brand-50' },
  ]

  const signupMax = Math.max(1, ...signups.map(s => s.count))
  const postsMax = Math.max(1, ...postsDaily.map(d => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map(h => h.count))
  const peakHour = byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0])
  const planMax = Math.max(1, ...PLAN_ORDER.map(k => planCounts[k] ?? 0))
  const mrrMax = Math.max(1, ...PLAN_ORDER.map(k => mrrByPlan[k] ?? 0))
  const platMax = Math.max(1, ...platforms.map(p => p.count))
  const clientMax = Math.max(1, ...topClients.map(c => c.count))

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide performance across all users</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={16} /></div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* User growth */}
      <div className="card p-6 mb-6">
        <h2 className="font-medium text-gray-900 text-sm mb-1">New users — last 30 days</h2>
        <div className="flex items-end gap-[3px] h-36 mt-4">
          {signups.map(s => (
            <div key={s.date} className="flex-1 h-full flex flex-col justify-end relative group">
              <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(s.count > 0 ? 3 : 0, (s.count / signupMax) * 100)}%`, background: BRAND }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1 shadow-lg">
                {dayLabel(s.date)}: {s.count}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
          <span>{dayLabel(signups[0].date)}</span><span>{dayLabel(signups[Math.floor(signups.length / 2)].date)}</span><span>Today</span>
        </div>
      </div>

      {/* Posts over time */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-medium text-gray-900 text-sm">Posts — last 30 days</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: EMERALD }} /> Published</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: RED }} /> Failed</span>
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-40 mt-4">
          {postsDaily.map(d => {
            const total = d.published + d.failed
            return (
              <div key={d.date} className="flex-1 h-full flex flex-col justify-end relative group">
                <div className="w-full flex flex-col-reverse" style={{ height: `${(total / postsMax) * 100}%` }}>
                  {d.published > 0 && <div style={{ height: `${(d.published / total) * 100}%`, background: EMERALD }} className="w-full rounded-t-[3px]" />}
                  {d.failed > 0 && <div style={{ height: `${(d.failed / total) * 100}%`, background: RED, marginBottom: d.published > 0 ? 2 : 0 }} className="w-full rounded-t-[3px]" />}
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1 shadow-lg">
                  <div className="font-medium">{dayLabel(d.date)}</div>
                  <div className="text-emerald-300">{d.published} published</div>
                  {d.failed > 0 && <div className="text-red-300">{d.failed} failed</div>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
          <span>{dayLabel(postsDaily[0].date)}</span><span>{dayLabel(postsDaily[Math.floor(postsDaily.length / 2)].date)}</span><span>Today</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Delivery donut */}
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 text-sm mb-4">Delivery outcome</h2>
          {delivery.published + delivery.failed === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No completed posts yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <Donut published={delivery.published} failed={delivery.failed} rate={delivery.successRate} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-gray-600">Published</span><span className="font-medium text-gray-900 ml-auto">{delivery.published}</span></div>
                <div className="flex items-center gap-2"><XCircle size={14} className="text-red-500" /><span className="text-gray-600">Failed</span><span className="font-medium text-gray-900 ml-auto">{delivery.failed}</span></div>
                {delivery.pending > 0 && <div className="flex items-center gap-2"><Clock size={14} className="text-amber-500" /><span className="text-gray-600">In progress</span><span className="font-medium text-gray-900 ml-auto">{delivery.pending}</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* Best posting times */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900 text-sm">Best posting times (IST)</h2>
            {peakHour.count > 0 && <span className="text-xs text-gray-400">Peak: {hourLabel(peakHour.hour)}</span>}
          </div>
          {peakHour.count === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No published posts yet.</p>
          ) : (
            <div className="flex items-end gap-[2px] h-32">
              {byHour.map(h => (
                <div key={h.hour} className="flex-1 h-full flex flex-col justify-end relative group">
                  <div className="w-full rounded-t-[2px]" style={{ height: `${Math.max(h.count > 0 ? 4 : 0, (h.count / hourMax) * 100)}%`, background: h.hour === peakHour.hour ? BRAND : '#c7d2fe' }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1 shadow-lg">{hourLabel(h.hour)}: {h.count}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-gray-400 mt-2"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Plan distribution */}
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 text-sm mb-4">Subscribers by plan</h2>
          <div className="space-y-3">
            {PLAN_ORDER.map(k => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-500 capitalize">{k}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                  <div className="h-full rounded-md" style={{ width: `${((planCounts[k] ?? 0) / planMax) * 100}%`, background: BRAND }} />
                </div>
                <span className="w-8 text-right text-sm font-medium text-gray-900">{planCounts[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MRR by plan */}
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 text-sm mb-4">Est. MRR by plan</h2>
          <div className="space-y-3">
            {PLAN_ORDER.filter(k => k !== 'free').map(k => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-500 capitalize">{k}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                  <div className="h-full rounded-md" style={{ width: `${((mrrByPlan[k] ?? 0) / mrrMax) * 100}%`, background: EMERALD }} />
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-900">{inr(mrrByPlan[k] ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Platform mix */}
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 text-sm mb-4">Posts by platform</h2>
          {platforms.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No posts yet.</p> : (
            <div className="space-y-3">
              {platforms.map(p => (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-500 capitalize">{p.platform}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full rounded-md" style={{ width: `${(p.count / platMax) * 100}%`, background: BRAND }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium text-gray-900">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 text-sm mb-4">Top clients by published posts</h2>
          {topClients.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No published posts yet.</p> : (
            <div className="space-y-3">
              {topClients.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="flex-1 text-xs text-gray-600 truncate">{c.name}</span>
                  <div className="w-24 h-5 bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full rounded-md" style={{ width: `${(c.count / clientMax) * 100}%`, background: EMERALD }} />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Donut({ published, failed, rate }: { published: number; failed: number; rate: number }) {
  const total = published + failed
  const r = 42
  const c = 2 * Math.PI * r
  const pubLen = total > 0 ? (published / total) * c : 0
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke={RED} strokeWidth="14" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={EMERALD} strokeWidth="14" strokeDasharray={`${pubLen} ${c - pubLen}`} strokeDashoffset={c * 0.25} transform="rotate(-90 60 60)" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 600 }}>{rate}%</text>
      <text x="60" y="76" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>success</text>
    </svg>
  )
}
