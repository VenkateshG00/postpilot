'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, TrendingUp, CalendarDays, Download,
  Clock, Inbox, Eye, Heart, MessageCircle, Bookmark,
  RefreshCw, ExternalLink,
} from 'lucide-react'

interface TopPost {
  id: string
  caption: string
  published_at: string
  topic: string
  reach: number
  likes: number
  comments: number
  saves: number
  ig_permalink: string | null
  image_url: string | null
}

interface Props {
  kpis: {
    published: number; failed: number; pending: number
    successRate: number | null; last7: number; last30: number; total: number
  }
  engagement: {
    totalReach: number; totalLikes: number; totalComments: number; totalSaves: number
    avgReach: number | null; postsWithData: number; hasEngagement: boolean
  }
  daily: { date: string; published: number; failed: number }[]
  byHour: { hour: number; count: number }[]
  perAccount: { name: string; published: number; failed: number; total: number; reach: number; likes: number }[]
  topPosts: TopPost[]
  csvRows: { datetime: string; status: string; platform: string; account: string; reach: string | number; likes: string | number; comments: string | number; saves: string | number }[]
}

const EMERALD = '#10b981'
const RED = '#ef4444'
const BRAND = '#3355ff'

function hourLabel(h: number) {
  const ap = h < 12 ? 'AM' : 'PM'
  return `${h % 12 === 0 ? 12 : h % 12} ${ap}`
}
function dayLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export default function AnalyticsClient(props: Props) {
  const { kpis, engagement, daily, byHour, perAccount, topPosts, csvRows } = props
  const router = useRouter()
  const synced = useRef(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Trigger a background sync on mount (once per session).
  useEffect(() => {
    if (synced.current || kpis.published === 0) return
    synced.current = true
    setSyncing(true)
    fetch('/api/analytics/sync')
      .then(r => r.json())
      .then((d: { synced?: number; message?: string }) => {
        if (d.synced && d.synced > 0) {
          setSyncMsg(`Updated metrics for ${d.synced} post${d.synced === 1 ? '' : 's'}`)
          // Refresh server data so the updated numbers appear.
          router.refresh()
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false))
  }, [kpis.published, router])

  function manualSync() {
    synced.current = false
    setSyncMsg('')
    // Reset the ref so the effect can run again — trigger via state
    setSyncing(true)
    fetch('/api/analytics/sync')
      .then(r => r.json())
      .then((d: { synced?: number; message?: string }) => {
        setSyncMsg(d.synced ? `Updated ${d.synced} post${d.synced === 1 ? '' : 's'}` : 'Already up to date')
        if (d.synced && d.synced > 0) router.refresh()
      })
      .catch(() => setSyncMsg('Sync failed'))
      .finally(() => setSyncing(false))
  }

  function exportCsv() {
    const header = ['Date (IST)', 'Status', 'Platform', 'Account', 'Reach', 'Likes', 'Comments', 'Saves']
    const lines = [header.join(',')]
    for (const r of csvRows) {
      lines.push([r.datetime, r.status, r.platform, `"${(r.account || '').replace(/"/g, '""')}"`, r.reach, r.likes, r.comments, r.saves].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `postpilot-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dailyMax = Math.max(1, ...daily.map(d => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map(h => h.count))
  const peakHour = byHour.reduce((a, b) => b.count > a.count ? b : a, byHour[0])
  const empty = kpis.total === 0

  const deliveryTiles = [
    { label: 'Posts published', value: kpis.published, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Success rate', value: kpis.successRate === null ? '—' : `${kpis.successRate}%`, icon: TrendingUp, color: 'text-brand-600 bg-brand-50' },
    { label: 'Published (7 days)', value: kpis.last7, icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
    { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ]

  const engagementTiles = [
    { label: 'Total reach', value: engagement.hasEngagement ? fmt(engagement.totalReach) : '—', icon: Eye, color: 'text-sky-600 bg-sky-50' },
    { label: 'Total likes', value: engagement.hasEngagement ? fmt(engagement.totalLikes) : '—', icon: Heart, color: 'text-pink-600 bg-pink-50' },
    { label: 'Total saves', value: engagement.hasEngagement ? fmt(engagement.totalSaves) : '—', icon: Bookmark, color: 'text-amber-600 bg-amber-50' },
    { label: 'Avg reach / post', value: engagement.avgReach !== null ? fmt(engagement.avgReach) : '—', icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
  ]

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            How your automated posts are performing
            {engagement.postsWithData > 0 && (
              <span className="ml-1 text-gray-400">· reach &amp; engagement from {engagement.postsWithData} post{engagement.postsWithData === 1 ? '' : 's'}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw size={12} className="animate-spin" /> Fetching metrics…
            </span>
          )}
          {syncMsg && !syncing && (
            <span className="text-xs text-emerald-600">{syncMsg}</span>
          )}
          <button onClick={manualSync} disabled={syncing} className="btn-secondary disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Refresh metrics
          </button>
          <button onClick={exportCsv} disabled={empty} className="btn-secondary disabled:opacity-50">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {empty ? (
        <div className="card p-16 text-center">
          <Inbox size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No post data yet — once PostPilot starts publishing, your stats show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Delivery KPI tiles */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Delivery</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {deliveryTiles.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement KPI tiles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Engagement</p>
              {!engagement.hasEngagement && (
                <span className="text-xs text-gray-400">(fetching from Instagram — click "Refresh metrics")</span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {engagementTiles.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
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
                        <div style={{ height: `${(d.published / total) * 100}%`, background: EMERALD }} className="w-full rounded-t-[3px]" />
                      )}
                      {d.failed > 0 && (
                        <div style={{ height: `${(d.failed / total) * 100}%`, background: RED, marginBottom: d.published > 0 ? 2 : 0 }} className="w-full rounded-t-[3px]" />
                      )}
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
              <span>{dayLabel(daily[0].date)}</span>
              <span>{dayLabel(daily[Math.floor(daily.length / 2)].date)}</span>
              <span>Today</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Delivery donut */}
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
                  {byHour.map(h => (
                    <div key={h.hour} className="flex-1 h-full flex flex-col justify-end relative group">
                      <div
                        className="w-full rounded-t-[2px]"
                        style={{
                          height: `${Math.max(h.count > 0 ? 4 : 0, (h.count / hourMax) * 100)}%`,
                          background: h.hour === peakHour.hour ? BRAND : '#c7d2fe',
                        }}
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

          {/* Top posts by reach */}
          {topPosts.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-gray-900 text-sm">Top posts by reach</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Your best-performing posts from Instagram Insights</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <th className="text-left px-6 py-2.5 font-medium">Post</th>
                      <th className="text-right px-4 py-2.5 font-medium">Date</th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        <span className="flex items-center gap-1 justify-end"><Eye size={11} /> Reach</span>
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        <span className="flex items-center gap-1 justify-end"><Heart size={11} /> Likes</span>
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        <span className="flex items-center gap-1 justify-end"><MessageCircle size={11} /> Comments</span>
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        <span className="flex items-center gap-1 justify-end"><Bookmark size={11} /> Saves</span>
                      </th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topPosts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            {p.image_url && (
                              <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                            )}
                            <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{p.caption || p.topic || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{shortDate(p.published_at)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(p.reach)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(p.likes)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{p.comments}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{p.saves}</td>
                        <td className="px-4 py-3 text-center">
                          {p.ig_permalink && (
                            <a href={p.ig_permalink} target="_blank" rel="noreferrer"
                              className="text-gray-400 hover:text-brand-600 transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-account table */}
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
                    <th className="text-right px-6 py-2.5 font-medium">Total reach</th>
                    <th className="text-right px-6 py-2.5 font-medium">Total likes</th>
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
                        <td className="px-6 py-3 text-right text-gray-700">{a.reach > 0 ? fmt(a.reach) : '—'}</td>
                        <td className="px-6 py-3 text-right text-gray-700">{a.likes > 0 ? fmt(a.likes) : '—'}</td>
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
      <circle cx="60" cy="60" r={r} fill="none" stroke={EMERALD} strokeWidth="14"
        strokeDasharray={`${pubLen} ${c - pubLen}`} strokeDashoffset={c * 0.25}
        transform="rotate(-90 60 60)" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 600 }}>{rate}%</text>
      <text x="60" y="76" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>success</text>
    </svg>
  )
}
