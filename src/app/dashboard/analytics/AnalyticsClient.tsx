'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, TrendingUp, CalendarDays, Download,
  Clock, Inbox, Eye, Heart, MessageCircle, Bookmark,
  RefreshCw, ExternalLink,
} from 'lucide-react'

interface TopPost {
  id: string; caption: string; published_at: string; topic: string
  reach: number; likes: number; comments: number; saves: number
  ig_permalink: string | null; image_url: string | null
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

/* ── Stat tile ───────────────────────────────────────────── */
function Tile({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent: string
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

/* ── Donut ───────────────────────────────────────────────── */
function Donut({ published, failed, rate }: { published: number; failed: number; rate: number }) {
  const r = 42, c = 2 * Math.PI * r
  const total = published + failed
  const pubLen = total > 0 ? (published / total) * c : 0
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#ef4444" strokeWidth="14" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#22c55e" strokeWidth="14"
        strokeDasharray={`${pubLen} ${c - pubLen}`} strokeDashoffset={c * 0.25}
        transform="rotate(-90 60 60)" strokeLinecap="round" />
      <text x="60" y="56" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 22, fontWeight: 700 }}>{rate}%</text>
      <text x="60" y="74" textAnchor="middle" fill="var(--text-muted)" style={{ fontSize: 10 }}>success</text>
    </svg>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function AnalyticsClient(props: Props) {
  const { kpis, engagement, daily, byHour, perAccount, topPosts, csvRows } = props
  const router = useRouter()
  const synced = useRef(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    if (synced.current || kpis.published === 0) return
    synced.current = true
    setSyncing(true)
    fetch('/api/analytics/sync')
      .then(r => r.json())
      .then((d: { synced?: number }) => {
        if (d.synced && d.synced > 0) { setSyncMsg(`Updated metrics for ${d.synced} post${d.synced === 1 ? '' : 's'}`); router.refresh() }
      })
      .catch(() => {})
      .finally(() => setSyncing(false))
  }, [kpis.published, router])

  function manualSync() {
    synced.current = false; setSyncMsg(''); setSyncing(true)
    fetch('/api/analytics/sync')
      .then(r => r.json())
      .then((d: { synced?: number }) => {
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
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `postpilot-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const dailyMax = Math.max(1, ...daily.map(d => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map(h => h.count))
  const peakHour = byHour.reduce((a, b) => b.count > a.count ? b : a, byHour[0])
  const empty = kpis.total === 0

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            How your automated posts are performing
            {engagement.postsWithData > 0 && (
              <span className="ml-1"> · reach from {engagement.postsWithData} posts</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncing && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={12} className="animate-spin" /> Fetching metrics…
            </span>
          )}
          {syncMsg && !syncing && (
            <span className="text-xs" style={{ color: '#22c55e' }}>{syncMsg}</span>
          )}
          <button
            onClick={manualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={empty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {empty ? (
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Inbox size={28} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No post data yet — once PostPilot starts publishing, your stats show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Delivery KPIs */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Delivery</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Posts published" value={kpis.published} icon={CheckCircle2} accent="#22c55e" />
              <Tile label="Success rate" value={kpis.successRate === null ? '—' : `${kpis.successRate}%`} icon={TrendingUp} accent="var(--accent)" />
              <Tile label="Last 7 days" value={kpis.last7} icon={CalendarDays} accent="#a855f7" />
              <Tile label="Failed" value={kpis.failed} icon={XCircle} accent="#ef4444" />
            </div>
          </div>

          {/* Engagement KPIs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Engagement</p>
              {!engagement.hasEngagement && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>(click "Refresh" to fetch from Instagram)</span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Total reach"     value={engagement.hasEngagement ? fmt(engagement.totalReach)    : '—'} icon={Eye}      accent="#0ea5e9" />
              <Tile label="Total likes"     value={engagement.hasEngagement ? fmt(engagement.totalLikes)    : '—'} icon={Heart}    accent="#ec4899" />
              <Tile label="Total saves"     value={engagement.hasEngagement ? fmt(engagement.totalSaves)    : '—'} icon={Bookmark} accent="#f59e0b" />
              <Tile label="Avg reach/post"  value={engagement.avgReach !== null ? fmt(engagement.avgReach) : '—'} icon={TrendingUp} accent="#8b5cf6" />
            </div>
          </div>

          {/* Posts over time bar chart */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Posts — last 30 days</h2>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#22c55e' }} /> Published</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#ef4444' }} /> Failed</span>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-36">
              {daily.map(d => {
                const total = d.published + d.failed
                return (
                  <div key={d.date} className="flex-1 h-full flex flex-col justify-end relative group">
                    <div className="w-full flex flex-col-reverse" style={{ height: `${(total / dailyMax) * 100}%` }}>
                      {d.published > 0 && (
                        <div style={{ height: `${(d.published / total) * 100}%`, background: '#22c55e' }} className="w-full rounded-t-[3px]" />
                      )}
                      {d.failed > 0 && (
                        <div style={{ height: `${(d.failed / total) * 100}%`, background: '#ef4444', marginBottom: d.published > 0 ? 2 : 0 }} className="w-full rounded-t-[3px]" />
                      )}
                    </div>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-xl text-white text-[11px] px-2.5 py-1.5 shadow-xl"
                      style={{ background: '#111' }}>
                      <div className="font-semibold">{dayLabel(d.date)}</div>
                      <div style={{ color: '#86efac' }}>{d.published} published</div>
                      {d.failed > 0 && <div style={{ color: '#fca5a5' }}>{d.failed} failed</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
              <span>{dayLabel(daily[0].date)}</span>
              <span>{dayLabel(daily[Math.floor(daily.length / 2)].date)}</span>
              <span>Today</span>
            </div>
          </div>

          {/* Donut + Best times */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Delivery donut */}
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="font-bold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Delivery outcome</h2>
              {kpis.published + kpis.failed === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No completed posts yet.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <Donut published={kpis.published} failed={kpis.failed} rate={kpis.successRate ?? 0} />
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Published</span>
                      <span className="font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>{kpis.published}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle size={14} style={{ color: '#ef4444' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Failed</span>
                      <span className="font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>{kpis.failed}</span>
                    </div>
                    {kpis.pending > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: '#f59e0b' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                        <span className="font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>{kpis.pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Best posting times */}
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Best posting times (IST)</h2>
                {peakHour?.count > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Peak: {hourLabel(peakHour.hour)}</span>}
              </div>
              {!peakHour || peakHour.count === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No published posts yet.</p>
              ) : (
                <>
                  <div className="flex items-end gap-[2px] h-28">
                    {byHour.map(h => (
                      <div key={h.hour} className="flex-1 h-full flex flex-col justify-end relative group">
                        <div
                          className="w-full rounded-t-[2px]"
                          style={{
                            height: `${Math.max(h.count > 0 ? 4 : 0, (h.count / hourMax) * 100)}%`,
                            background: h.hour === peakHour.hour ? 'var(--accent)' : 'rgba(255,77,77,0.2)',
                          }}
                        />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg text-white text-[11px] px-2 py-1 shadow-xl" style={{ background: '#111' }}>
                          {hourLabel(h.hour)}: {h.count}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top posts */}
          {topPosts.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top posts by reach</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your best-performing posts from Instagram Insights</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                      {['Post', 'Date', 'Reach', 'Likes', 'Comments', 'Saves', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map(p => (
                      <tr key={p.id} className="transition-colors hover:bg-white/3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-5 py-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            {p.image_url && <img src={p.image_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />}
                            <span className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{p.caption || p.topic || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{shortDate(p.published_at)}</td>
                        <td className="px-5 py-3 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(p.reach)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(p.likes)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{p.comments}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{p.saves}</td>
                        <td className="px-5 py-3">
                          {p.ig_permalink && (
                            <a href={p.ig_permalink} target="_blank" rel="noreferrer" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
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
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>By account</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {['Account', 'Published', 'Failed', 'Success rate', 'Total reach', 'Total likes'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perAccount.map(a => {
                    const decided = a.published + a.failed
                    const rate = decided > 0 ? Math.round((a.published / decided) * 100) : null
                    return (
                      <tr key={a.name} className="transition-colors hover:bg-white/3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.published}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.failed}</td>
                        <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{rate === null ? '—' : `${rate}%`}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.reach > 0 ? fmt(a.reach) : '—'}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.likes > 0 ? fmt(a.likes) : '—'}</td>
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
