'use client'

import { CheckCircle2, XCircle, TrendingUp, CalendarDays, Download, Clock, Inbox } from 'lucide-react'

interface Props {
  kpis: { published: number; failed: number; pending: number; successRate: number | null; last7: number; last30: number; total: number }
  daily: { date: string; published: number; failed: number }[]
  byHour: { hour: number; count: number }[]
  perAccount: { name: string; published: number; failed: number; total: number }[]
  csvRows: { datetime: string; status: string; platform: string; account: string }[]
}

const EMERALD = '#10b981'
const RED = '#ef4444'
const BRAND = '#3355ff'

function hourLabel(h: number): string {
  const ap = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${ap}`
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function AnalyticsClient(props: Props) {
  const { kpis, daily, byHour, perAccount, csvRows } = props

  function exportCsv() {
    const header = ['Date (IST)', 'Status', 'Platform', 'Account']
    const lines = [header.join(',')]
    for (const r of csvRows) {
      lines.push([r.datetime, r.status, r.platform, `"${(r.account || '').replace(/"/g, '""')}"`].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `postpilot-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dailyMax = Math.max(1, ...daily.map((d) => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map((h) => h.count))
  const peakHour = byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0])
  const empty = kpis.total === 0

  const tiles = [
    { label: 'Posts published', value: kpis.published, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Success rate', value: kpis.successRate === null ? '—' : `${kpis.successRate}%`, icon: TrendingUp, color: 'text-brand-600 bg-brand-50' },
    { label: 'Published (7 days)', value: kpis.last7, icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
    { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">How your automated posts are performing</p>
        </div>
        <button onClick={exportCsv} disabled={empty} className="btn-secondary disabled:opacity-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {empty ? (
        <div className="card p-16 text-center">
          <Inbox size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No post data yet — once PostPilot starts publishing, your stats show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Posts over time */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-medium text-gray-900 text-sm">Posts — last 30 days</h2>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: EMERALD }} /> Published</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: RED }} /> Failed</span>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-40 mt-4">
              {daily.map((d) => {
                const total = d.published + d.failed
                return (
                  <div key={d.date} className="flex-1 h-full flex flex-col justify-end relative group">
                    <div className="w-full flex flex-col-reverse" style={{ height: `${(total / dailyMax) * 100}%` }}>
                      {d.published > 0 && (
                        <div style={{ height: `${(d.published / total) * 100}%`, background: EMERALD }} className="w-full rounded-t-[3px] first:rounded-t-[3px]" />
                      )}
                      {d.failed > 0 && (
                        <div style={{ height: `${(d.failed / total) * 100}%`, background: RED, marginBottom: d.published > 0 ? 2 : 0 }} className="w-full rounded-t-[3px]" />
                      )}
                    </div>
                    {/* Tooltip */}
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
              <span>{dayLabel(daily[0].date)}</span>
              <span>{dayLabel(daily[Math.floor(daily.length / 2)].date)}</span>
              <span>Today</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Success donut */}
            <div className="card p-6">
              <h2 className="font-medium text-gray-900 text-sm mb-4">Delivery outcome</h2>
              {kpis.published + kpis.failed === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No completed posts yet.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <Donut published={kpis.published} failed={kpis.failed} rate={kpis.successRate ?? 0} />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-gray-600">Published</span>
                      <span className="font-medium text-gray-900 ml-auto">{kpis.published}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle size={14} className="text-red-500" />
                      <span className="text-gray-600">Failed</span>
                      <span className="font-medium text-gray-900 ml-auto">{kpis.failed}</span>
                    </div>
                    {kpis.pending > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-500" />
                        <span className="text-gray-600">In progress</span>
                        <span className="font-medium text-gray-900 ml-auto">{kpis.pending}</span>
                      </div>
                    )}
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
                  {byHour.map((h) => (
                    <div key={h.hour} className="flex-1 h-full flex flex-col justify-end relative group">
                      <div
                        className="w-full rounded-t-[2px]"
                        style={{ height: `${Math.max(h.count > 0 ? 4 : 0, (h.count / hourMax) * 100)}%`, background: h.hour === peakHour.hour ? BRAND : '#c7d2fe' }}
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1 shadow-lg">
                        {hourLabel(h.hour)}: {h.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
              </div>
            </div>
          </div>

          {/* Per-account */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-medium text-gray-900 text-sm">By account</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="text-left px-6 py-2.5 font-medium">Account</th>
                    <th className="text-right px-6 py-2.5 font-medium">Published</th>
                    <th className="text-right px-6 py-2.5 font-medium">Failed</th>
                    <th className="text-right px-6 py-2.5 font-medium">Success rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {perAccount.map((a) => {
                    const decided = a.published + a.failed
                    const rate = decided > 0 ? Math.round((a.published / decided) * 100) : null
                    return (
                      <tr key={a.name}>
                        <td className="px-6 py-3 text-gray-700">{a.name}</td>
                        <td className="px-6 py-3 text-right text-gray-700">{a.published}</td>
                        <td className="px-6 py-3 text-right text-gray-700">{a.failed}</td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900">{rate === null ? '—' : `${rate}%`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={EMERALD} strokeWidth="14"
        strokeDasharray={`${pubLen} ${c - pubLen}`} strokeDashoffset={c * 0.25} transform="rotate(-90 60 60)"
        strokeLinecap="round"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 600 }}>{rate}%</text>
      <text x="60" y="76" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>success</text>
    </svg>
  )
}
