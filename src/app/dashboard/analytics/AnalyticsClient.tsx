'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, TrendingUp, CalendarDays, Download,
  Clock, Inbox, Eye, Heart, MessageCircle, Bookmark,
  RefreshCw, ExternalLink, BarChart3, Users, Image,
  Film, Layers, FileText, Activity, UserCheck, Percent,
} from 'lucide-react'

/* ── Types ────────────────────────────────────────────── */
interface TopPost {
  id: string; caption: string; published_at: string; topic: string
  reach: number; likes: number; comments: number; saves: number
  ig_permalink: string | null; image_url: string | null
}

interface IGPost {
  id: string; caption: string; media_type: string
  media_url: string | null; thumbnail_url: string | null
  timestamp: string; permalink: string | null
  like_count: number; comments_count: number
}

interface IGProfile {
  username: string; media_count: number
  followers_count: number; follows_count: number
  profile_picture: string | null
}

interface IGSummary {
  total_posts: number; total_likes: number
  total_comments: number; engagement_rate: number; followers: number
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
  activeAccountId?: string | null
}

type AnalyticsTab = 'overview' | 'posts' | 'account'
type DateRange = '7d' | '30d' | '90d' | 'all'

/* ── Helpers ──────────────────────────────────────────── */
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
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
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

/* ── Component ───────────────────────────────────────────── */
export default function AnalyticsClient({ kpis, engagement, daily, byHour, perAccount, topPosts, csvRows, activeAccountId }: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const synced = useRef(false)
  const [tab, setTab] = useState<AnalyticsTab>('overview')
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  // Instagram API data
  const [igPosts, setIgPosts] = useState<IGPost[]>([])
  const [igProfile, setIgProfile] = useState<IGProfile | null>(null)
  const [igSummary, setIgSummary] = useState<IGSummary | null>(null)
  const [igLoading, setIgLoading] = useState(true)
  const igFetched = useRef(false)

  /* Fetch Instagram posts from API */
  useEffect(() => {
    if (igFetched.current) return
    igFetched.current = true
    setIgLoading(true)
    const params = activeAccountId ? `?account_id=${activeAccountId}` : ''
    fetch(`/api/analytics/instagram${params}`)
      .then(r => r.json())
      .then((d: { posts?: IGPost[]; profile?: IGProfile | null; summary?: IGSummary }) => {
        if (d.posts) setIgPosts(d.posts)
        if (d.profile) setIgProfile(d.profile)
        if (d.summary) setIgSummary(d.summary)
      })
      .catch(() => {})
      .finally(() => setIgLoading(false))
  }, [activeAccountId])

  /* Auto-sync post_logs metrics */
  useEffect(() => {
    if (synced.current || kpis.published === 0) return
    synced.current = true; setSyncing(true)
    fetch('/api/analytics/sync')
      .then(r => r.json())
      .then((d: { synced?: number }) => {
        if (d.synced && d.synced > 0) { setSyncMsg(`Updated ${d.synced} posts`); router.refresh() }
      })
      .catch(() => {})
      .finally(() => setSyncing(false))
  }, [kpis.published, router])

  function manualSync() {
    synced.current = false; setSyncMsg(''); setSyncing(true)
    // Refresh both post_logs metrics and Instagram posts
    Promise.all([
      fetch('/api/analytics/sync').then(r => r.json()),
      fetch(`/api/analytics/instagram${activeAccountId ? `?account_id=${activeAccountId}` : ''}`).then(r => r.json()),
    ])
      .then(([syncData, igData]: [{ synced?: number }, { posts?: IGPost[]; profile?: IGProfile | null; summary?: IGSummary }]) => {
        setSyncMsg(syncData.synced ? `Updated ${syncData.synced} post${syncData.synced === 1 ? '' : 's'}` : 'Up to date')
        if (syncData.synced && syncData.synced > 0) router.refresh()
        if (igData.posts) setIgPosts(igData.posts)
        if (igData.profile) setIgProfile(igData.profile)
        if (igData.summary) setIgSummary(igData.summary)
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

  /* Filtered daily data by date range */
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : daily.length
  const filteredDaily = daily.slice(-rangeDays)

  const dailyMax = Math.max(1, ...filteredDaily.map(d => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map(h => h.count))
  const peakHour = byHour.reduce((a, b) => b.count > a.count ? b : a, byHour[0])
  const empty = kpis.total === 0 && igPosts.length === 0

  /* Filter IG posts by date range */
  const now = Date.now()
  const rangeDaysMs = dateRange === '7d' ? 7 * 86400000 : dateRange === '30d' ? 30 * 86400000 : dateRange === '90d' ? 90 * 86400000 : Infinity
  const filteredIgPosts = rangeDaysMs === Infinity
    ? igPosts
    : igPosts.filter(p => now - new Date(p.timestamp).getTime() < rangeDaysMs)

  const TABS: { id: AnalyticsTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'posts',    label: 'Posts',    icon: Image },
    { id: 'account',  label: 'Account',  icon: Users },
  ]

  const DATE_RANGES: { id: DateRange; label: string }[] = [
    { id: '7d',  label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'all', label: 'All time' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {igProfile ? (
              <>@{igProfile.username} · {fmt(igProfile.followers_count)} followers · {igPosts.length} posts loaded</>
            ) : (
              <>How your automated posts are performing</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(syncing || igLoading) && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={12} className="animate-spin" /> {igLoading ? 'Loading Instagram…' : 'Fetching metrics…'}
            </span>
          )}
          {syncMsg && !syncing && !igLoading && (
            <span className="text-xs" style={{ color: '#22c55e' }}>{syncMsg}</span>
          )}
          <button onClick={manualSync} disabled={syncing || igLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={empty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tab bar + Date range */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-1">
          {DATE_RANGES.map(r => (
            <button key={r.id} onClick={() => setDateRange(r.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: dateRange === r.id ? 'var(--accent-subtle)' : 'transparent',
                color: dateRange === r.id ? 'var(--accent)' : 'var(--text-muted)',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {empty && !igLoading ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Inbox size={28} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No post data yet — connect your Instagram account to see analytics.
          </p>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                   */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div className="space-y-6">

              {/* Instagram KPIs — from live API */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Instagram Account</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Tile label="Followers" value={igSummary ? fmt(igSummary.followers) : '—'} icon={UserCheck} accent="#8b5cf6" />
                  <Tile label="Engagement rate" value={igSummary ? `${igSummary.engagement_rate}%` : '—'} icon={Percent} accent="#22c55e" />
                  <Tile label="Total likes" value={igSummary ? fmt(igSummary.total_likes) : '—'} icon={Heart} accent="#ec4899" />
                  <Tile label="Total comments" value={igSummary ? fmt(igSummary.total_comments) : '—'} icon={MessageCircle} accent="#0ea5e9" />
                </div>
              </div>

              {/* Delivery KPIs — from post_logs */}
              {kpis.total > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>PostPilot Delivery</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Tile label="Posts published" value={kpis.published} icon={CheckCircle2} accent="#22c55e" />
                    <Tile label="Success rate" value={kpis.successRate === null ? '—' : `${kpis.successRate}%`} icon={TrendingUp} accent="var(--accent)" />
                    <Tile label="Last 7 days" value={kpis.last7} icon={CalendarDays} accent="#a855f7" />
                    <Tile label="Failed" value={kpis.failed} icon={XCircle} accent="#ef4444" />
                  </div>
                </div>
              )}

              {/* Engagement KPIs — from post_logs sync */}
              {engagement.hasEngagement && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Reach &amp; Saves</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Tile label="Total reach" value={fmt(engagement.totalReach)} icon={Eye} accent="#0ea5e9" />
                    <Tile label="Total saves" value={fmt(engagement.totalSaves)} icon={Bookmark} accent="#f59e0b" />
                    <Tile label="Avg reach/post" value={engagement.avgReach !== null ? fmt(engagement.avgReach) : '—'} icon={TrendingUp} accent="#8b5cf6" />
                    <Tile label="Posts with data" value={engagement.postsWithData} icon={Activity} accent="#22c55e" />
                  </div>
                </div>
              )}

              {/* Posts over time */}
              {kpis.total > 0 && (
                <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Posts — {dateRange === 'all' ? 'all time' : `last ${dateRange.replace('d', ' days')}`}</h2>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#22c55e' }} /> Published</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#ef4444' }} /> Failed</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-[3px] h-36">
                    {filteredDaily.map(d => {
                      const total = d.published + d.failed
                      return (
                        <div key={d.date} className="flex-1 h-full flex flex-col justify-end relative group">
                          <div className="w-full flex flex-col-reverse" style={{ height: `${(total / dailyMax) * 100}%` }}>
                            {d.published > 0 && <div style={{ height: `${(d.published / total) * 100}%`, background: '#22c55e' }} className="w-full rounded-t-[3px]" />}
                            {d.failed > 0 && <div style={{ height: `${(d.failed / total) * 100}%`, background: '#ef4444', marginBottom: d.published > 0 ? 2 : 0 }} className="w-full rounded-t-[3px]" />}
                          </div>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-xl text-white text-[11px] px-2.5 py-1.5 shadow-xl" style={{ background: '#111' }}>
                            <div className="font-semibold">{dayLabel(d.date)}</div>
                            <div style={{ color: '#86efac' }}>{d.published} published</div>
                            {d.failed > 0 && <div style={{ color: '#fca5a5' }}>{d.failed} failed</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {filteredDaily.length > 0 && (
                    <div className="flex justify-between text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      <span>{dayLabel(filteredDaily[0].date)}</span>
                      <span>{dayLabel(filteredDaily[Math.floor(filteredDaily.length / 2)].date)}</span>
                      <span>Today</span>
                    </div>
                  )}
                </div>
              )}

              {/* Donut + Best times */}
              {kpis.total > 0 && (
                <div className="grid lg:grid-cols-2 gap-4">
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
                              <div className="w-full rounded-t-[2px]" style={{
                                height: `${Math.max(h.count > 0 ? 4 : 0, (h.count / hourMax) * 100)}%`,
                                background: h.hour === peakHour.hour ? 'var(--accent)' : 'rgba(255,77,77,0.2)',
                              }} />
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
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* POSTS TAB — Instagram posts from API           */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'posts' && (
            <div className="space-y-6">

              {/* Instagram posts grid */}
              {igLoading ? (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading Instagram posts…</p>
                </div>
              ) : filteredIgPosts.length > 0 ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Instagram Posts</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {filteredIgPosts.length} posts from your connected account
                        {igSummary && igSummary.engagement_rate > 0 && (
                          <span> · {igSummary.engagement_rate}% engagement rate</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1"><Image size={12} /> {filteredIgPosts.filter(p => p.media_type === 'IMAGE').length}</span>
                      <span className="flex items-center gap-1"><Film size={12} /> {filteredIgPosts.filter(p => p.media_type === 'VIDEO').length}</span>
                      <span className="flex items-center gap-1"><Layers size={12} /> {filteredIgPosts.filter(p => p.media_type === 'CAROUSEL_ALBUM').length}</span>
                    </div>
                  </div>

                  {/* Post cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredIgPosts.map(p => {
                      const thumb = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url
                      return (
                        <div key={p.id} className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          {/* Thumbnail */}
                          {thumb ? (
                            <div className="relative aspect-square overflow-hidden">
                              <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                              {/* Media type badge */}
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                                {p.media_type === 'VIDEO' ? 'REEL' : p.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : 'POST'}
                              </div>
                              {/* Engagement overlay on hover */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                                <span className="flex items-center gap-1.5 text-sm font-bold"><Heart size={16} fill="white" /> {fmt(p.like_count)}</span>
                                <span className="flex items-center gap-1.5 text-sm font-bold"><MessageCircle size={16} fill="white" /> {fmt(p.comments_count)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                              <Image size={32} style={{ color: 'var(--border)' }} />
                            </div>
                          )}
                          {/* Info */}
                          <div className="p-3">
                            <p className="text-xs line-clamp-2 leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>
                              {p.caption ? p.caption.slice(0, 100) : 'No caption'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1"><Heart size={11} /> {fmt(p.like_count)}</span>
                                <span className="flex items-center gap-1"><MessageCircle size={11} /> {fmt(p.comments_count)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(p.timestamp)}</span>
                                {p.permalink && (
                                  <a href={p.permalink} target="_blank" rel="noreferrer" className="hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <Image size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {igPosts.length === 0 ? 'Connect your Instagram account to see posts here.' : 'No posts in this date range.'}
                  </p>
                </div>
              )}

              {/* Top posts by reach (from post_logs sync) */}
              {topPosts.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top PostPilot Posts by Reach</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Posts created through PostPilot with Instagram Insights data</p>
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
                          <tr key={p.id} className="transition-colors hover:brightness-95" style={{ borderBottom: '1px solid var(--border)' }}>
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
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* ACCOUNT TAB                                    */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'account' && (
            <div className="space-y-6">

              {/* Instagram profile card */}
              {igProfile && (
                <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-4 mb-4">
                    {igProfile.profile_picture && (
                      <img src={igProfile.profile_picture} alt="" className="w-14 h-14 rounded-full object-cover" />
                    )}
                    <div>
                      <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>@{igProfile.username}</h2>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connected Instagram account</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.media_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Posts</p>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.followers_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Followers</p>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.follows_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Following</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-account table */}
              {perAccount.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>PostPilot Performance</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Breakdown by connected Instagram account</p>
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
                            <tr key={a.name} className="transition-colors hover:brightness-95" style={{ borderBottom: '1px solid var(--border)' }}>
                              <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>@{a.name}</td>
                              <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.published}</td>
                              <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.failed}</td>
                              <td className="px-5 py-3">
                                <span className="font-bold px-2 py-0.5 rounded-full text-xs"
                                  style={{
                                    background: rate !== null && rate >= 90 ? 'rgba(34,197,94,0.1)' : rate !== null && rate >= 70 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: rate !== null && rate >= 90 ? '#22c55e' : rate !== null && rate >= 70 ? '#f59e0b' : '#ef4444',
                                  }}>
                                  {rate === null ? '—' : `${rate}%`}
                                </span>
                              </td>
                              <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.reach > 0 ? fmt(a.reach) : '—'}</td>
                              <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{a.likes > 0 ? fmt(a.likes) : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Account summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Tile label="Connected accounts" value={perAccount.length || 1} icon={Users} accent="var(--accent)" />
                <Tile label="Total posts (PostPilot)" value={kpis.published + kpis.failed + kpis.pending} icon={BarChart3} accent="#8b5cf6" />
                <Tile label="Last 30 days" value={kpis.last30} icon={CalendarDays} accent="#0ea5e9" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
