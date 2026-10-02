'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, TrendingUp, Download, Clock,
  Heart, MessageCircle, Bookmark, RefreshCw, ExternalLink,
  BarChart3, Eye, Image as ImageIcon, Film, Layers,
  Hash, Activity, ChevronDown, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Zap, Send,
  type LucideIcon,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
interface PostRow {
  id: string; caption: string; published_at: string; created_at: string
  content_type: string; topic: string
  likes: number; comments: number; reach: number; impressions: number; saves: number
  ig_permalink: string | null; image_url: string | null; ig_media_id: string | null
  has_metrics: boolean
}

interface Props {
  kpis: {
    published: number; failed: number; pending: number
    successRate: number | null; total: number
  }
  engagement: {
    totalReach: number; totalLikes: number; totalComments: number; totalSaves: number
    totalImpressions: number; postsWithData: number; hasEngagement: boolean
  }
  daily: { date: string; published: number; failed: number }[]
  dayHourMap: Record<string, number>
  perAccount: { name: string; published: number; failed: number; total: number }[]
  postRows: PostRow[]
  activeAccountId?: string | null
}

type DateRange = '7d' | '30d' | '90d'
type EngagementMetric = 'reach' | 'impressions' | 'likes' | 'comments' | 'saves'
type HashtagMetric = 'engagement' | 'reach' | 'uses'

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
const IST = 5.5 * 60 * 60 * 1000

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
function fmtPct(n: number) {
  return n < 10 ? n.toFixed(2) + '%' : n.toFixed(1) + '%'
}
function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
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
function istDate(ts: string) {
  return new Date(new Date(ts).getTime() + IST).toISOString().slice(0, 10)
}
function hourLabel(h: number) {
  const ap = h < 12 ? 'AM' : 'PM'
  return `${h % 12 === 0 ? 12 : h % 12}${ap}`
}

const CONTENT_TYPES: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  post: { label: 'Post', color: '#0ea5e9', icon: ImageIcon },
  reel: { label: 'Reel', color: '#ec4899', icon: Film },
  story: { label: 'Story', color: '#f59e0b', icon: Zap },
  carousel: { label: 'Carousel', color: '#8b5cf6', icon: Layers },
}

function getContentInfo(type: string) {
  return CONTENT_TYPES[type] || CONTENT_TYPES['post']
}

/* ═══════════════════════════════════════════════════════
   Stat Card
   ═══════════════════════════════════════════════════════ */
function StatCard({ label, value, icon: Icon, accent, change }: {
  label: string; value: string | number; icon: LucideIcon; accent: string
  change?: { value: number; label: string } | null
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}14`, color: accent }}>
          <Icon size={16} />
        </div>
        {change && change.value !== 0 && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color: change.value > 0 ? '#16a34a' : '#dc2626',
              background: change.value > 0 ? '#16a34a12' : '#dc262612',
            }}>
            {change.value > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {change && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          {change.label}
        </p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Section wrapper
   ═══════════════════════════════════════════════════════ */
function Section({ title, description, children, action }: {
  title: string; description: string; children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════ */
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-pre-line z-50 max-w-[240px] text-center"
          style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
          {text}
        </span>
      )}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════
   Date range selector
   ═══════════════════════════════════════════════════════ */
function DateFilter({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const opts: { id: DateRange; label: string }[] = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
  ]
  return (
    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg)' }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: value === o.id ? 'var(--bg-card)' : 'transparent',
            color: value === o.id ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: value === o.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Metric selector pills
   ═══════════════════════════════════════════════════════ */
function MetricPills<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: value === o.id ? 'var(--accent)' : 'var(--bg)',
            color: value === o.id ? '#fff' : 'var(--text-muted)',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function AnalyticsClient({ kpis, engagement, daily, dayHourMap, perAccount, postRows, activeAccountId }: Props) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [engMetric, setEngMetric] = useState<EngagementMetric>('reach')
  const [hashMetric, setHashMetric] = useState<HashtagMetric>('engagement')
  const synced = useRef(false)
  const [igFollowers, setIgFollowers] = useState<number>(0)
  const [igLoading, setIgLoading] = useState(true)

  // Fetch IG profile for followers count (needed for engagement rate)
  useEffect(() => {
    let cancelled = false
    async function fetchIG() {
      try {
        const url = activeAccountId
          ? `/api/analytics/instagram?account_id=${activeAccountId}`
          : '/api/analytics/instagram'
        const r = await fetch(url)
        if (!r.ok) return
        const d = await r.json()
        if (!cancelled && d.summary?.followers) {
          setIgFollowers(d.summary.followers)
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setIgLoading(false) }
    }
    fetchIG()
    return () => { cancelled = true }
  }, [activeAccountId])

  // Auto-sync metrics on mount
  useEffect(() => {
    if (synced.current || kpis.published === 0) return
    synced.current = true
    fetch('/api/analytics/sync').then(r => r.json()).then(d => {
      if (d.synced > 0) router.refresh()
    }).catch(() => {})
  }, [kpis.published, router])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch('/api/analytics/sync')
      const d = await r.json()
      setSyncMsg(d.synced > 0 ? `Synced ${d.synced} posts` : 'All up to date')
      if (d.synced > 0) router.refresh()
    } catch { setSyncMsg('Sync failed') }
    finally { setSyncing(false) }
  }, [router])

  // ── Date-filtered data ────────────────────────────────────
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
  const cutoffMs = Date.now() - rangeDays * 86400000

  const filteredPosts = useMemo(() =>
    postRows.filter(p => new Date(p.published_at).getTime() >= cutoffMs),
    [postRows, cutoffMs]
  )
  const filteredPostsWithMetrics = useMemo(() =>
    filteredPosts.filter(p => p.has_metrics),
    [filteredPosts]
  )

  const filteredDaily = useMemo(() => daily.slice(-rangeDays), [daily, rangeDays])

  // Previous period for comparison
  const prevCutoffMs = cutoffMs - rangeDays * 86400000
  const prevPosts = useMemo(() =>
    postRows.filter(p => {
      const t = new Date(p.published_at).getTime()
      return t >= prevCutoffMs && t < cutoffMs
    }).filter(p => p.has_metrics),
    [postRows, prevCutoffMs, cutoffMs]
  )

  // ── KPI computations ─────────────────────────────────────
  const currentMetrics = useMemo(() => {
    const posts = filteredPostsWithMetrics
    const count = posts.length
    const totalReach = posts.reduce((s, p) => s + p.reach, 0)
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0)
    const totalComments = posts.reduce((s, p) => s + p.comments, 0)
    const totalSaves = posts.reduce((s, p) => s + p.saves, 0)
    const totalImpressions = posts.reduce((s, p) => s + p.impressions, 0)
    const avgEngagement = count > 0 && igFollowers > 0
      ? ((totalLikes + totalComments) / count) / igFollowers * 100
      : null
    return { count, totalReach, totalLikes, totalComments, totalSaves, totalImpressions, avgEngagement }
  }, [filteredPostsWithMetrics, igFollowers])

  const prevMetrics = useMemo(() => {
    const posts = prevPosts
    const count = posts.length
    const totalReach = posts.reduce((s, p) => s + p.reach, 0)
    const avgEngagement = count > 0 && igFollowers > 0
      ? ((posts.reduce((s, p) => s + p.likes + p.comments, 0)) / count) / igFollowers * 100
      : null
    return { count, totalReach, avgEngagement }
  }, [prevPosts, igFollowers])

  function pctChange(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  // ── Delivery stats ────────────────────────────────────────
  const deliveryStats = useMemo(() => {
    const pub = filteredDaily.reduce((s, d) => s + d.published, 0)
    const fail = filteredDaily.reduce((s, d) => s + d.failed, 0)
    const total = pub + fail
    const rate = total > 0 ? (pub / total) * 100 : null
    return { published: pub, failed: fail, total, rate }
  }, [filteredDaily])

  // ── Engagement over time ──────────────────────────────────
  const engagementTimeline = useMemo(() => {
    const byDate: Record<string, { reach: number; impressions: number; likes: number; comments: number; saves: number; count: number }> = {}
    for (const p of filteredPostsWithMetrics) {
      const d = istDate(p.published_at)
      if (!byDate[d]) byDate[d] = { reach: 0, impressions: 0, likes: 0, comments: 0, saves: 0, count: 0 }
      byDate[d].reach += p.reach
      byDate[d].impressions += p.impressions
      byDate[d].likes += p.likes
      byDate[d].comments += p.comments
      byDate[d].saves += p.saves
      byDate[d].count++
    }
    return filteredDaily
      .filter(d => byDate[d.date])
      .map(d => ({ date: d.date, value: byDate[d.date][engMetric], count: byDate[d.date].count }))
  }, [filteredPostsWithMetrics, filteredDaily, engMetric])

  // ── Content type performance ──────────────────────────────
  const contentPerformance = useMemo(() => {
    const map: Record<string, { count: number; reach: number; likes: number; comments: number; saves: number; impressions: number }> = {}
    for (const p of filteredPostsWithMetrics) {
      const t = p.content_type || 'post'
      if (!map[t]) map[t] = { count: 0, reach: 0, likes: 0, comments: 0, saves: 0, impressions: 0 }
      map[t].count++
      map[t].reach += p.reach
      map[t].likes += p.likes
      map[t].comments += p.comments
      map[t].saves += p.saves
      map[t].impressions += p.impressions
    }
    return Object.entries(map)
      .map(([type, stats]) => ({
        type,
        ...getContentInfo(type),
        count: stats.count,
        avgReach: stats.count > 0 ? Math.round(stats.reach / stats.count) : 0,
        avgEngagement: stats.count > 0 ? Math.round((stats.likes + stats.comments) / stats.count) : 0,
        avgSaves: stats.count > 0 ? Math.round(stats.saves / stats.count) : 0,
        totalReach: stats.reach,
        totalLikes: stats.likes,
      }))
      .sort((a, b) => b.avgReach - a.avgReach)
  }, [filteredPostsWithMetrics])

  // ── Hashtag performance ───────────────────────────────────
  const hashtagPerf = useMemo(() => {
    const map: Record<string, { totalER: number; totalReach: number; count: number }> = {}
    for (const p of filteredPostsWithMetrics) {
      const tags = (p.caption || '').match(/#[\w\u0080-￿]+/g) || []
      const er = igFollowers > 0 ? ((p.likes + p.comments) / igFollowers) * 100 : 0
      for (const tag of tags) {
        const t = tag.toLowerCase()
        if (!map[t]) map[t] = { totalER: 0, totalReach: 0, count: 0 }
        map[t].totalER += er
        map[t].totalReach += p.reach
        map[t].count++
      }
    }
    return Object.entries(map)
      .filter(([, v]) => v.count >= 2)
      .map(([tag, v]) => ({
        tag,
        avgER: v.totalER / v.count,
        avgReach: Math.round(v.totalReach / v.count),
        uses: v.count,
      }))
      .sort((a, b) => {
        if (hashMetric === 'reach') return b.avgReach - a.avgReach
        if (hashMetric === 'uses') return b.uses - a.uses
        return b.avgER - a.avgER
      })
      .slice(0, 10)
  }, [filteredPostsWithMetrics, igFollowers, hashMetric])

  // ── Posting patterns: GitHub heatmap (last 6 months) ──────
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of postRows) {
      const d = istDate(p.published_at)
      counts[d] = (counts[d] ?? 0) + 1
    }
    const now = new Date(Date.now() + IST)
    const start = new Date(now)
    start.setMonth(start.getMonth() - 6)
    start.setDate(1)
    // Align to Sunday
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1)

    const weeks: { date: string; count: number; day: number }[][] = []
    let currentWeek: { date: string; count: number; day: number }[] = []
    const cursor = new Date(start)
    let maxCount = 0

    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 10)
      const count = counts[key] ?? 0
      if (count > maxCount) maxCount = count
      currentWeek.push({ date: key, count, day: cursor.getDay() })
      if (cursor.getDay() === 6) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    if (currentWeek.length > 0) weeks.push(currentWeek)

    // Month labels
    const months: { label: string; weekIndex: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const firstDay = week[0]
      if (firstDay) {
        const m = new Date(firstDay.date + 'T00:00:00').getMonth()
        if (m !== lastMonth) {
          months.push({ label: new Date(firstDay.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }), weekIndex: wi })
          lastMonth = m
        }
      }
    })

    return { weeks, months, maxCount }
  }, [postRows])

  // ── Day × time heatmap ────────────────────────────────────
  const dayTimeHeatmap = useMemo(() => {
    const periods = [
      { label: 'Morning', hours: [6, 7, 8, 9, 10, 11] },
      { label: 'Afternoon', hours: [12, 13, 14, 15, 16, 17] },
      { label: 'Evening', hours: [18, 19, 20, 21, 22, 23] },
      { label: 'Night', hours: [0, 1, 2, 3, 4, 5] },
    ]
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    let maxVal = 0
    const grid: number[][] = days.map((_, dayIdx) =>
      periods.map(period => {
        const val = period.hours.reduce((s, h) => s + (dayHourMap[`${dayIdx}-${h}`] ?? 0), 0)
        if (val > maxVal) maxVal = val
        return val
      })
    )

    return { periods, days, grid, maxVal }
  }, [dayHourMap])

  // ── Top performing content ────────────────────────────────
  const topPosts = useMemo(() =>
    filteredPostsWithMetrics
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 8),
    [filteredPostsWithMetrics]
  )

  // ── CSV export ────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const header = 'Date,Content Type,Reach,Likes,Comments,Saves,Impressions,Caption\n'
    const csvRows = filteredPosts.map(p =>
      `${p.published_at},${p.content_type},${p.reach},${p.likes},${p.comments},${p.saves},${p.impressions},"${(p.caption || '').replace(/"/g, '""').slice(0, 100)}"`
    ).join('\n')
    const blob = new Blob([header + csvRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `postpilot-analytics-${dateRange}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [filteredPosts, dateRange])

  // ── Empty state ───────────────────────────────────────────
  if (kpis.total === 0 && postRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          <BarChart3 size={24} />
        </div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No analytics data yet</h2>
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Publish your first post to start seeing analytics here. Metrics sync automatically from Instagram.
        </p>
      </div>
    )
  }

  const reachChange = pctChange(currentMetrics.totalReach, prevMetrics.totalReach)
  const erChange = currentMetrics.avgEngagement && prevMetrics.avgEngagement
    ? pctChange(currentMetrics.avgEngagement, prevMetrics.avgEngagement)
    : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {engagement.postsWithData > 0
              ? `Metrics from ${engagement.postsWithData} posts with Instagram data`
              : 'Syncing metrics from Instagram...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <Download size={12} /> CSV
          </button>
        </div>
      </div>
      {syncMsg && (
        <p className="text-xs px-3 py-1.5 rounded-lg inline-block"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          {syncMsg}
        </p>
      )}

      {/* ── 1. KPI Summary ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Posts" value={filteredPosts.length} icon={Send} accent="#0ea5e9"
          change={prevMetrics.count > 0 ? {
            value: Number(pctChange(filteredPosts.length, prevMetrics.count)?.toFixed(1) ?? 0),
            label: `vs previous ${rangeDays}d`
          } : null} />
        <StatCard label="Engagement Rate" icon={Activity} accent="#8b5cf6"
          value={currentMetrics.avgEngagement !== null ? fmtPct(currentMetrics.avgEngagement) : '---'}
          change={erChange !== null ? {
            value: Number(erChange.toFixed(1)),
            label: `vs previous ${rangeDays}d`
          } : null} />
        <StatCard label="Total Reach" icon={Eye} accent="#0ea5e9"
          value={currentMetrics.totalReach > 0 ? fmt(currentMetrics.totalReach) : '---'}
          change={reachChange !== null && currentMetrics.totalReach > 0 ? {
            value: Number(reachChange.toFixed(1)),
            label: `vs previous ${rangeDays}d`
          } : null} />
        <StatCard label="Delivery Success" icon={CheckCircle2} accent="#16a34a"
          value={kpis.successRate !== null ? `${kpis.successRate}%` : '---'}
          change={null} />
      </div>

      {/* ── Engagement rate explainer ───────────────────────── */}
      {currentMetrics.avgEngagement !== null && currentMetrics.avgEngagement > 0 && (
        <p className="text-[10px] -mt-2 px-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Engagement rate = (avg likes + comments per post) ÷ followers × 100.
          {currentMetrics.avgEngagement > 100 && ' Values above 100% mean average engagement per post exceeds your follower count — this happens when posts reach beyond your followers.'}
          {igFollowers > 0 && ` Based on ${fmt(igFollowers)} followers.`}
        </p>
      )}

      {/* ── 2. Engagement Over Time ─────────────────────────── */}
      <Section title="Engagement Over Time" description="Is my performance improving?"
        action={
          <MetricPills<EngagementMetric>
            options={[
              { id: 'reach', label: 'Reach' },
              { id: 'impressions', label: 'Impressions' },
              { id: 'likes', label: 'Likes' },
              { id: 'comments', label: 'Comments' },
              { id: 'saves', label: 'Saves' },
            ]}
            value={engMetric} onChange={setEngMetric} />
        }>
        {engagementTimeline.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No engagement data for this period. Metrics sync automatically after posts are published.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(engagementTimeline.length * 28, 200)} 160`} className="w-full" style={{ minWidth: 300, maxHeight: 200 }}>
              {(() => {
                const maxVal = Math.max(1, ...engagementTimeline.map(d => d.value))
                const w = engagementTimeline.length * 28
                const h = 130
                const padL = 0, padB = 30
                const points = engagementTimeline.map((d, i) => ({
                  x: padL + (i / Math.max(1, engagementTimeline.length - 1)) * (w - padL),
                  y: h - (d.value / maxVal) * (h - padB),
                  ...d,
                }))
                const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
                const area = `${line} L${points[points.length - 1]?.x ?? 0},${h} L${points[0]?.x ?? 0},${h} Z`
                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                      <g key={pct}>
                        <line x1={0} x2={w} y1={h - pct * (h - padB)} y2={h - pct * (h - padB)}
                          stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4,4" />
                        <text x={0} y={h - pct * (h - padB) - 4} fontSize={9} fill="var(--text-muted)">
                          {fmt(Math.round(maxVal * pct))}
                        </text>
                      </g>
                    ))}
                    {/* Area */}
                    <path d={area} fill="var(--accent)" opacity={0.08} />
                    {/* Line */}
                    <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} />
                    {/* Dots */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
                        <title>{`${shortDate(p.date)}: ${fmt(p.value)} ${engMetric} (${p.count} post${p.count > 1 ? 's' : ''})`}</title>
                      </g>
                    ))}
                    {/* X labels */}
                    {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1).map((p, i) => (
                      <text key={i} x={p.x} y={h + 14} fontSize={9} textAnchor="middle" fill="var(--text-muted)">
                        {shortDate(p.date)}
                      </text>
                    ))}
                  </>
                )
              })()}
            </svg>
          </div>
        )}
      </Section>

      {/* ── 3. Content Type Performance ──────────────────────── */}
      <Section title="Content Performance" description="What type of content performs best?">
        {contentPerformance.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No content type data available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {contentPerformance.map(ct => {
              const maxReach = Math.max(1, ...contentPerformance.map(c => c.avgReach))
              const Icon = ct.icon
              return (
                <div key={ct.type} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <Icon size={14} style={{ color: ct.color }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{ct.label}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-7 rounded-md overflow-hidden" style={{ background: 'var(--bg)' }}>
                      <div className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                        style={{ width: `${Math.max(8, (ct.avgReach / maxReach) * 100)}%`, background: `${ct.color}20` }}>
                        <span className="text-[11px] font-semibold" style={{ color: ct.color }}>
                          {fmt(ct.avgReach)} avg reach
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 flex-shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{ct.count} posts</span>
                    <span>{fmt(ct.avgEngagement)} avg eng.</span>
                    <span className="hidden sm:inline">{fmt(ct.avgSaves)} avg saves</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── 4. Hashtag Performance ──────────────────────────── */}
      <Section title="Hashtag Performance" description="What hashtags perform best?"
        action={
          <MetricPills<HashtagMetric>
            options={[
              { id: 'engagement', label: 'Engagement' },
              { id: 'reach', label: 'Reach' },
              { id: 'uses', label: 'Uses' },
            ]}
            value={hashMetric} onChange={setHashMetric} />
        }>
        {hashtagPerf.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            {igFollowers === 0 && !igLoading
              ? 'Connect your Instagram account to see hashtag performance.'
              : 'Not enough hashtag data yet. Hashtags need 2+ uses to appear here.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {hashtagPerf.map((h, i) => {
              const maxVal = hashMetric === 'reach'
                ? Math.max(1, ...hashtagPerf.map(x => x.avgReach))
                : hashMetric === 'uses'
                  ? Math.max(1, ...hashtagPerf.map(x => x.uses))
                  : Math.max(1, ...hashtagPerf.map(x => x.avgER))
              const barVal = hashMetric === 'reach' ? h.avgReach : hashMetric === 'uses' ? h.uses : h.avgER
              return (
                <div key={h.tag} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-32 sm:w-40 flex-shrink-0 truncate" style={{ color: 'var(--accent)' }}>
                    {h.tag}
                  </span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <div className="h-full rounded transition-all duration-500 flex items-center px-2"
                      style={{ width: `${Math.max(8, (barVal / maxVal) * 100)}%`, background: 'var(--accent-subtle)' }}>
                      <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                        {hashMetric === 'engagement' ? fmtPct(h.avgER) : hashMetric === 'reach' ? fmt(h.avgReach) : h.uses}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{h.uses} posts</span>
                    {hashMetric !== 'engagement' && <span>{fmtPct(h.avgER)} ER</span>}
                    {hashMetric !== 'reach' && <span>{fmt(h.avgReach)} reach</span>}
                  </div>
                </div>
              )
            })}
            {igFollowers > 0 && (
              <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                Engagement rate per hashtag = avg (likes + comments) ÷ {fmt(igFollowers)} followers × 100 across posts using that tag.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ── 5. Posting Patterns ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GitHub-style activity heatmap */}
        <Section title="Posting Activity" description="When am I posting? (last 6 months)">
          <div className="overflow-x-auto -mx-2 px-2">
            <div style={{ minWidth: 680 }}>
              {/* Month labels */}
              <div className="flex mb-1 ml-8">
                {heatmapData.months.map((m, i) => (
                  <span key={i} className="text-[10px]" style={{
                    color: 'var(--text-muted)',
                    marginLeft: i === 0 ? `${m.weekIndex * 14}px` : `${(m.weekIndex - (heatmapData.months[i - 1]?.weekIndex ?? 0)) * 14 - 24}px`,
                  }}>
                    {m.label}
                  </span>
                ))}
              </div>
              {/* Grid */}
              <div className="flex gap-0">
                {/* Day labels */}
                <div className="flex flex-col justify-between pr-1.5" style={{ height: 7 * 14 }}>
                  {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                    <span key={i} className="text-[9px] leading-[14px]" style={{ color: 'var(--text-muted)' }}>{d}</span>
                  ))}
                </div>
                {/* Weeks */}
                <div className="flex gap-[2px]">
                  {heatmapData.weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const cell = week.find(c => c.day === dayIdx)
                        if (!cell) return <div key={dayIdx} style={{ width: 12, height: 12 }} />
                        const intensity = heatmapData.maxCount > 0 ? cell.count / heatmapData.maxCount : 0
                        const bg = cell.count === 0
                          ? 'var(--bg)'
                          : intensity <= 0.25 ? 'rgba(34,197,94,0.2)'
                          : intensity <= 0.5 ? 'rgba(34,197,94,0.4)'
                          : intensity <= 0.75 ? 'rgba(34,197,94,0.6)'
                          : '#22c55e'
                        return (
                          <div key={dayIdx} className="rounded-sm" style={{ width: 12, height: 12, background: bg }}
                            title={`${new Date(cell.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: ${cell.count} post${cell.count !== 1 ? 's' : ''}`} />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-1 mt-2 ml-8">
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map(lvl => (
                  <div key={lvl} className="rounded-sm" style={{
                    width: 10, height: 10,
                    background: lvl === 0 ? 'var(--bg)' : `rgba(34,197,94,${lvl === 0.25 ? 0.2 : lvl === 0.5 ? 0.4 : lvl === 0.75 ? 0.6 : 1})`,
                  }} />
                ))}
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>More</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Day × Time heatmap */}
        <Section title="Best Posting Times" description="Day × time posting analysis (IST)">
          {Object.values(dayHourMap).every(v => v === 0) ? (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>Not enough posting data yet.</p>
          ) : (
            <div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(4, 1fr)' }}>
                {/* Header */}
                <div />
                {dayTimeHeatmap.periods.map(p => (
                  <div key={p.label} className="text-[10px] font-medium text-center pb-1" style={{ color: 'var(--text-muted)' }}>{p.label}</div>
                ))}
                {/* Rows */}
                {dayTimeHeatmap.days.map((day, di) => (
                  <>
                    <div key={`label-${di}`} className="text-[10px] font-medium pr-2 flex items-center" style={{ color: 'var(--text-muted)' }}>{day}</div>
                    {dayTimeHeatmap.grid[di].map((val, pi) => {
                      const intensity = dayTimeHeatmap.maxVal > 0 ? val / dayTimeHeatmap.maxVal : 0
                      return (
                        <div key={`${di}-${pi}`} className="rounded-md flex items-center justify-center h-8"
                          style={{
                            background: val === 0
                              ? 'var(--bg)'
                              : `rgba(139,92,246,${Math.max(0.12, intensity * 0.8)})`,
                          }}
                          title={`${day} ${dayTimeHeatmap.periods[pi].label}: ${val} post${val !== 1 ? 's' : ''}`}>
                          {val > 0 && (
                            <span className="text-[10px] font-semibold" style={{ color: intensity > 0.5 ? '#fff' : '#8b5cf6' }}>
                              {val}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* ── 6. PostPilot Delivery ────────────────────────────── */}
      <Section title="PostPilot Delivery" description="Is PostPilot successfully publishing my content?">
        {/* Summary row */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {deliveryStats.rate !== null && (
            <div>
              <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{deliveryStats.rate.toFixed(1)}%</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>success rate</p>
            </div>
          )}
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{deliveryStats.total}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>total</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{deliveryStats.published}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>published</p>
          </div>
          {deliveryStats.failed > 0 && (
            <div>
              <p className="text-lg font-bold" style={{ color: '#dc2626' }}>{deliveryStats.failed}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>failed</p>
            </div>
          )}
        </div>

        {/* Stacked bar chart */}
        {filteredDaily.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="flex items-end gap-[2px]" style={{ height: 140, minWidth: Math.max(filteredDaily.length * 12, 200) }}>
              {filteredDaily.map((d, i) => {
                const total = d.published + d.failed
                const maxDay = Math.max(1, ...filteredDaily.map(dd => dd.published + dd.failed))
                const barH = total > 0 ? (total / maxDay) * 120 : 0
                const pubH = total > 0 ? (d.published / total) * barH : 0
                const failH = barH - pubH
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ minWidth: 6 }}
                    title={`${shortDate(d.date)}\n${d.published} published${d.failed > 0 ? `\n${d.failed} failed` : ''}`}>
                    <div className="w-full flex flex-col rounded-t overflow-hidden" style={{ maxWidth: 16 }}>
                      {failH > 0 && <div style={{ height: failH, background: '#ef4444' }} />}
                      {pubH > 0 && <div style={{ height: pubH, background: '#22c55e' }} />}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{shortDate(filteredDaily[0].date)}</span>
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Today</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#22c55e' }} /> Published
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#ef4444' }} /> Failed
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No delivery data for this period.</p>
        )}
      </Section>

      {/* ── 7. Top Performing Content ────────────────────────── */}
      <Section title="Top Performing Content" description="Which posts performed best?">
        {topPosts.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No posts with engagement data yet. Metrics sync automatically from Instagram.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Post</th>
                  <th className="text-left py-2 px-2 font-medium hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Reach</th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    <Heart size={11} className="inline" /> Likes
                  </th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    <MessageCircle size={11} className="inline" /> Comments
                  </th>
                  <th className="text-right py-2 px-2 font-medium hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                    <Bookmark size={11} className="inline" /> Saves
                  </th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((p) => {
                  const info = getContentInfo(p.content_type)
                  return (
                    <tr key={p.id} className="group" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                              style={{ background: 'var(--bg)' }}>
                              <ImageIcon size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                          <span className="truncate max-w-[180px] sm:max-w-[240px]" style={{ color: 'var(--text-primary)' }}>
                            {p.caption.replace(/\n/g, ' ').slice(0, 60) || 'No caption'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 hidden sm:table-cell">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: `${info.color}14`, color: info.color }}>
                          {info.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(p.published_at)}</td>
                      <td className="py-2.5 px-2 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(p.reach)}</td>
                      <td className="py-2.5 px-2 text-right" style={{ color: 'var(--text-muted)' }}>{fmt(p.likes)}</td>
                      <td className="py-2.5 px-2 text-right" style={{ color: 'var(--text-muted)' }}>{fmt(p.comments)}</td>
                      <td className="py-2.5 px-2 text-right hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{fmt(p.saves)}</td>
                      <td className="py-2.5 px-2 text-right">
                        {p.ig_permalink && (
                          <a href={p.ig_permalink} target="_blank" rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--accent)' }}>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
