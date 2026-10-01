'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, TrendingUp, CalendarDays, Download,
  Clock, Inbox, Eye, Heart, MessageCircle, Bookmark,
  RefreshCw, ExternalLink, BarChart3, Users, Image,
  Film, Layers, FileText, Activity, UserCheck, Percent,
  Zap, Hash, Grid3X3, List, Filter, Award, Flame,
  Target, Lightbulb, Star, ChevronDown, ChevronLeft,
  ChevronRight, Link2, Play, Trophy, Medal, Crown,
  Calendar, ArrowUpRight, ArrowDownRight, Minus,
  LayoutGrid, ListOrdered, type LucideIcon,
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

type AnalyticsTab = 'overview' | 'plan' | 'posts' | 'trial-reels' | 'account' | 'media-kit'
type DateRange = '7d' | '14d' | '30d' | '90d' | 'custom'
type PostFilter = 'all' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'IMAGE'
type PostView = 'grid' | 'list'

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
function fmtPct(n: number) {
  return n < 10 ? n.toFixed(2) + '%' : n.toFixed(1) + '%'
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
function getDayName(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}
function getMonthName(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/* ── Stat tile ───────────────────────────────────────────── */
function Tile({ label, value, icon: Icon, accent, subtext, trend }: {
  label: string; value: string | number; icon: LucideIcon; accent: string
  subtext?: string; trend?: { value: number; positive: boolean }
}) {
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon size={16} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: trend.positive ? '#22c55e' : '#ef4444' }}>
            {trend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {subtext && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{subtext}</p>}
    </div>
  )
}

/* ── Date Range Picker ──────────────────────────────── */
function DateRangePicker({ dateRange, setDateRange, customStart, customEnd, setCustomStart, setCustomEnd }: {
  dateRange: DateRange; setDateRange: (r: DateRange) => void
  customStart: Date | null; customEnd: Date | null
  setCustomStart: (d: Date | null) => void; setCustomEnd: (d: Date | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const QUICK: { id: DateRange; label: string }[] = [
    { id: '7d', label: 'Last 7 days' },
    { id: '14d', label: 'Last 14 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
  ]

  const displayLabel = dateRange === 'custom' && customStart && customEnd
    ? `${shortDate(customStart.toISOString())} – ${shortDate(customEnd.toISOString())}`
    : QUICK.find(q => q.id === dateRange)?.label ?? 'Last 30 days'

  // Calendar helpers
  const calMonth2 = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)

  function renderMonth(month: Date) {
    const year = month.getFullYear()
    const mo = month.getMonth()
    const firstDay = new Date(year, mo, 1).getDay()
    const daysInMonth = new Date(year, mo + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    return (
      <div className="w-full">
        <p className="text-xs font-semibold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-[10px] font-semibold py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const cellDate = new Date(year, mo, day)
            const isStart = customStart && cellDate.toDateString() === customStart.toDateString()
            const isEnd = customEnd && cellDate.toDateString() === customEnd.toDateString()
            const inRange = customStart && customEnd && cellDate >= customStart && cellDate <= customEnd
            const isToday = cellDate.toDateString() === new Date().toDateString()
            const isFuture = cellDate > new Date()

            return (
              <button key={day} disabled={isFuture}
                onClick={() => {
                  if (!customStart || (customStart && customEnd)) {
                    setCustomStart(cellDate)
                    setCustomEnd(null)
                  } else if (cellDate < customStart) {
                    setCustomStart(cellDate)
                  } else {
                    setCustomEnd(cellDate)
                    setDateRange('custom')
                    setOpen(false)
                  }
                }}
                className="w-7 h-7 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
                style={{
                  background: isStart || isEnd ? 'var(--accent)' : inRange ? 'var(--accent-subtle)' : 'transparent',
                  color: isStart || isEnd ? '#fff' : isFuture ? 'var(--text-muted)' : 'var(--text-primary)',
                  border: isToday && !isStart && !isEnd ? '1px solid var(--accent)' : 'none',
                }}>
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        <Calendar size={12} />
        {displayLabel}
        <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: 480, maxWidth: 'calc(100vw - 2rem)' }}>
          {/* Quick ranges */}
          <div className="flex gap-2 mb-4">
            {QUICK.map(q => (
              <button key={q.id} onClick={() => { setDateRange(q.id); setOpen(false) }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1"
                style={{
                  background: dateRange === q.id ? 'var(--accent-subtle)' : 'var(--bg)',
                  color: dateRange === q.id ? 'var(--accent)' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}>
                {q.label}
              </button>
            ))}
          </div>

          {/* Two-month calendar */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
              className="p-1 rounded-lg hover:brightness-90" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
              className="p-1 rounded-lg hover:brightness-90" style={{ color: 'var(--text-muted)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {renderMonth(calMonth)}
            {renderMonth(calMonth2)}
          </div>

          {/* Selection info */}
          {customStart && !customEnd && (
            <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>Click another date to complete range</p>
          )}
        </div>
      )}
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

/* ── Posting Heatmap (GitHub-style) ──────────────────────── */
function PostingHeatmap({ posts, months = 6 }: { posts: IGPost[]; months?: number }) {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

  // Build day → count map
  const dayCounts: Record<string, number> = {}
  for (const p of posts) {
    const d = new Date(p.timestamp).toISOString().slice(0, 10)
    dayCounts[d] = (dayCounts[d] || 0) + 1
  }

  // Build weeks array
  const weeks: { date: Date; count: number }[][] = []
  let currentWeek: { date: Date; count: number }[] = []
  const cursor = new Date(startDate)
  // Align to Sunday
  cursor.setDate(cursor.getDate() - cursor.getDay())

  while (cursor <= now) {
    currentWeek.push({
      date: new Date(cursor),
      count: dayCounts[cursor.toISOString().slice(0, 10)] || 0,
    })
    if (cursor.getDay() === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  const maxCount = Math.max(1, ...Object.values(dayCounts))

  function getColor(count: number) {
    if (count === 0) return 'var(--bg)'
    const intensity = count / maxCount
    if (intensity <= 0.25) return 'rgba(34,197,94,0.2)'
    if (intensity <= 0.5) return 'rgba(34,197,94,0.4)'
    if (intensity <= 0.75) return 'rgba(34,197,94,0.6)'
    return '#22c55e'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div key={di}
                className="w-[11px] h-[11px] rounded-[2px] relative group"
                style={{ background: day.date > now ? 'transparent' : getColor(day.count), border: day.date > now ? 'none' : '1px solid rgba(128,128,128,0.1)' }}
                title={`${day.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${day.count} posts`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} className="w-[11px] h-[11px] rounded-[2px]" style={{ background: v === 0 ? 'var(--bg)' : `rgba(34,197,94,${v})` }} />
        ))}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  )
}

/* ── Badge Component ──────────────────────────────────── */
function Badge({ icon: Icon, label, earned, color }: { icon: LucideIcon; label: string; earned: boolean; color: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${earned ? '' : 'opacity-30 grayscale'}`}
      style={{ background: earned ? `${color}10` : 'var(--bg)', border: `1px solid ${earned ? color + '40' : 'var(--border)'}` }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: earned ? `${color}20` : 'var(--bg-card)', color: earned ? color : 'var(--text-muted)' }}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-semibold text-center leading-tight" style={{ color: earned ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

/* ── Performance Multiplier Badge ─────────────────────── */
function PerfBadge({ value }: { value: number }) {
  const isPositive = value > 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  const bg = isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold"
      style={{ background: bg, color }}>
      {isPositive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}x
    </span>
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
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)

  // Posts tab state
  const [postFilter, setPostFilter] = useState<PostFilter>('all')
  const [postView, setPostView] = useState<PostView>('grid')

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

  const manualSync = useCallback(() => {
    synced.current = false; setSyncMsg(''); setSyncing(true)
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
  }, [activeAccountId, router])

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
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : daily.length
  const filteredDaily = dateRange === 'custom' ? daily : daily.slice(-rangeDays)

  const dailyMax = Math.max(1, ...filteredDaily.map(d => d.published + d.failed))
  const hourMax = Math.max(1, ...byHour.map(h => h.count))
  const peakHour = byHour.reduce((a, b) => b.count > a.count ? b : a, byHour[0])
  const empty = kpis.total === 0 && igPosts.length === 0

  /* Filter IG posts by date range */
  const now = Date.now()
  const filteredIgPosts = useMemo(() => {
    let posts = igPosts
    if (dateRange === 'custom' && customStart && customEnd) {
      posts = posts.filter(p => {
        const t = new Date(p.timestamp).getTime()
        return t >= customStart.getTime() && t <= customEnd.getTime() + 86400000
      })
    } else if (dateRange !== 'custom') {
      const ms = rangeDays * 86400000
      posts = posts.filter(p => now - new Date(p.timestamp).getTime() < ms)
    }
    return posts
  }, [igPosts, dateRange, customStart, customEnd, rangeDays, now])

  /* Filtered by post type */
  const filteredByType = useMemo(() => {
    if (postFilter === 'all') return filteredIgPosts
    return filteredIgPosts.filter(p => p.media_type === postFilter)
  }, [filteredIgPosts, postFilter])

  /* ── Derived analytics ─────────────────────────────── */

  // Average ER for the account
  const avgER = useMemo(() => {
    if (!igSummary || igSummary.followers === 0 || filteredIgPosts.length === 0) return 0
    const totalEng = filteredIgPosts.reduce((s, p) => s + p.like_count + p.comments_count, 0)
    return (totalEng / filteredIgPosts.length) / igSummary.followers * 100
  }, [filteredIgPosts, igSummary])

  // Per-post ER and performance multiplier
  const postsWithER = useMemo(() => {
    return filteredIgPosts.map(p => {
      const eng = p.like_count + p.comments_count
      const er = igSummary && igSummary.followers > 0 ? (eng / igSummary.followers) * 100 : 0
      const multiplier = avgER > 0 ? er / avgER : 0
      return { ...p, er, multiplier }
    })
  }, [filteredIgPosts, igSummary, avgER])

  // Top posts by engagement
  const topByEngagement = useMemo(() => {
    return [...postsWithER].sort((a, b) => b.er - a.er).slice(0, 10)
  }, [postsWithER])

  // Format performance (Carousels vs Photos vs Reels)
  const formatPerformance = useMemo(() => {
    const groups: Record<string, { count: number; totalER: number; label: string }> = {
      CAROUSEL_ALBUM: { count: 0, totalER: 0, label: 'Carousels' },
      IMAGE: { count: 0, totalER: 0, label: 'Photos' },
      VIDEO: { count: 0, totalER: 0, label: 'Reels' },
    }
    for (const p of postsWithER) {
      const g = groups[p.media_type]
      if (g) { g.count++; g.totalER += p.er }
    }
    return Object.entries(groups)
      .map(([type, g]) => ({ type, label: g.label, count: g.count, avgER: g.count > 0 ? g.totalER / g.count : 0 }))
      .filter(g => g.count > 0)
      .sort((a, b) => b.avgER - a.avgER)
  }, [postsWithER])

  // Best times to post (top 3)
  const bestTimes = useMemo(() => {
    const dayHourMap: Record<string, { totalER: number; count: number }> = {}
    for (const p of postsWithER) {
      const d = new Date(p.timestamp)
      const dayName = getDayName(d)
      const hour = d.getHours()
      const key = `${dayName}-${hour}`
      if (!dayHourMap[key]) dayHourMap[key] = { totalER: 0, count: 0 }
      dayHourMap[key].totalER += p.er
      dayHourMap[key].count++
    }
    return Object.entries(dayHourMap)
      .map(([key, v]) => {
        const [day, hourStr] = key.split('-')
        const hour = parseInt(hourStr)
        return { day, hour, avgER: v.totalER / v.count, count: v.count }
      })
      .filter(t => t.count >= 1)
      .sort((a, b) => b.avgER - a.avgER)
      .slice(0, 3)
  }, [postsWithER])

  // Hashtag performance
  const hashtagPerf = useMemo(() => {
    const tagMap: Record<string, { totalER: number; count: number }> = {}
    for (const p of postsWithER) {
      const tags = (p.caption || '').match(/#\w+/g) || []
      for (const tag of tags) {
        const t = tag.toLowerCase()
        if (!tagMap[t]) tagMap[t] = { totalER: 0, count: 0 }
        tagMap[t].totalER += p.er
        tagMap[t].count++
      }
    }
    return Object.entries(tagMap)
      .map(([tag, v]) => ({ tag, avgER: v.totalER / v.count, count: v.count }))
      .filter(t => t.count >= 2)
      .sort((a, b) => b.avgER - a.avgER)
      .slice(0, 8)
  }, [postsWithER])

  // Posting streak
  const streak = useMemo(() => {
    const dates = new Set(igPosts.map(p => new Date(p.timestamp).toISOString().slice(0, 10)))
    let count = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (dates.has(d)) count++
      else if (i > 0) break // allow today to be empty
    }
    return count
  }, [igPosts])

  // Badges
  const badges = useMemo(() => {
    const postCount = igPosts.length
    const hasReel = igPosts.some(p => p.media_type === 'VIDEO')
    return [
      { icon: Star, label: 'First Post', earned: postCount >= 1, color: '#f59e0b' },
      { icon: Flame, label: '7-Day Streak', earned: streak >= 7, color: '#ef4444' },
      { icon: Play, label: 'First Reel', earned: hasReel, color: '#8b5cf6' },
      { icon: Target, label: 'Plan Complete', earned: kpis.published >= 7, color: '#22c55e' },
      { icon: Trophy, label: '30-Day Streak', earned: streak >= 30, color: '#f59e0b' },
      { icon: Crown, label: '50 Posts', earned: postCount >= 50, color: '#ec4899' },
      { icon: Medal, label: '100 Posts', earned: postCount >= 100, color: '#0ea5e9' },
      { icon: Zap, label: '5% ER', earned: avgER >= 5, color: '#22c55e' },
    ]
  }, [igPosts, streak, kpis.published, avgER])

  // Posts in last 7 days for weekly goal
  const postsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    return igPosts.filter(p => new Date(p.timestamp).getTime() > weekAgo).length
  }, [igPosts])

  const TABS: { id: AnalyticsTab; label: string; icon: LucideIcon }[] = [
    { id: 'overview',      label: 'Overview',      icon: BarChart3 },
    { id: 'plan',          label: 'Plan',          icon: Target },
    { id: 'posts',         label: 'Posts',         icon: Image },
    { id: 'trial-reels',   label: 'Trial Reels',   icon: Play },
    { id: 'account',       label: 'Account',       icon: Users },
    { id: 'media-kit',     label: 'Media Kit',     icon: FileText },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
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
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Tab bar + Date range picker */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            const TIcon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                <TIcon size={13} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>
        <DateRangePicker
          dateRange={dateRange} setDateRange={setDateRange}
          customStart={customStart} customEnd={customEnd}
          setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}
        />
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

              {/* Row 1: Key Instagram stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Published" value={kpis.published} icon={CheckCircle2} accent="#22c55e" />
                <Tile label="Engagement rate" value={igSummary ? fmtPct(avgER) : '—'} icon={Percent} accent="#8b5cf6" />
                <Tile label="Followers" value={igSummary ? fmt(igSummary.followers) : '—'} icon={UserCheck} accent="#0ea5e9" />
                <Tile label={`Posts ${dateRange === '30d' ? '30d' : dateRange === '7d' ? '7d' : ''}`} value={filteredIgPosts.length} icon={BarChart3} accent="#f59e0b" />
              </div>

              {/* Top posts by engagement — horizontal scroll */}
              {topByEngagement.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top posts by engagement</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your best performing content</p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto p-4 pb-5 scrollbar-thin">
                    {topByEngagement.map(p => {
                      const thumb = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url
                      return (
                        <div key={p.id} className="shrink-0 w-44 rounded-xl overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          {thumb ? (
                            <div className="relative aspect-square">
                              <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute top-2 left-2">
                                <PerfBadge value={p.multiplier} />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                              <Image size={24} style={{ color: 'var(--border)' }} />
                            </div>
                          )}
                          <div className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-semibold">
                              <span style={{ color: '#22c55e' }}>ER {fmtPct(p.er)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{timeAgo(p.timestamp)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              <span className="flex items-center gap-1"><Heart size={10} /> {fmt(p.like_count)}</span>
                              <span className="flex items-center gap-1"><MessageCircle size={10} /> {fmt(p.comments_count)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Format performance + Best times to post */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Format performance bar chart */}
                {formatPerformance.length > 0 && (
                  <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Format performance</h2>
                    <div className="space-y-4">
                      {formatPerformance.map(f => {
                        const maxER = Math.max(...formatPerformance.map(x => x.avgER), 0.01)
                        const barWidth = (f.avgER / maxER) * 100
                        return (
                          <div key={f.type}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.count} posts · avg {fmtPct(f.avgER)} ER</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${barWidth}%`,
                                background: f.type === 'CAROUSEL_ALBUM' ? '#8b5cf6' : f.type === 'VIDEO' ? '#ec4899' : '#0ea5e9',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Best times to post */}
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Best times to post</h2>
                  {bestTimes.length > 0 ? (
                    <div className="space-y-3">
                      {bestTimes.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ background: i === 0 ? '#f59e0b20' : 'var(--bg-card)', color: i === 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            #{i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {t.day} · {hourLabel(t.hour)} – {hourLabel(Math.min(t.hour + 2, 23))}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>avg {fmtPct(t.avgER)} ER · {t.count} posts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>Not enough data yet</p>
                  )}
                </div>
              </div>

              {/* Hashtag performance */}
              {hashtagPerf.length > 0 && (
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Hashtag performance</h2>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Ranked by average engagement rate (hashtags used in 2+ posts)</p>
                  <div className="space-y-3">
                    {hashtagPerf.map(h => {
                      const maxER = Math.max(...hashtagPerf.map(x => x.avgER), 0.01)
                      const barWidth = (h.avgER / maxER) * 100
                      return (
                        <div key={h.tag} className="flex items-center gap-3">
                          <span className="text-xs font-semibold w-28 shrink-0 truncate" style={{ color: 'var(--accent)' }}>{h.tag}</span>
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                            <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: 'var(--accent)' }} />
                          </div>
                          <span className="text-[10px] w-16 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {fmtPct(h.avgER)} · {h.count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Posting patterns heatmap */}
              {igPosts.length > 0 && (
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Posting patterns</h2>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Your posting activity over the last 6 months</p>
                  <PostingHeatmap posts={igPosts} months={6} />
                </div>
              )}

              {/* Posts over time bar chart */}
              {kpis.total > 0 && (
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>PostPilot delivery</h2>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#22c55e' }} /> Published</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#ef4444' }} /> Failed</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-[3px] h-28">
                    {filteredDaily.map(d => {
                      const total = d.published + d.failed
                      return (
                        <div key={d.date} className="flex-1 h-full flex flex-col justify-end relative group">
                          <div className="w-full flex flex-col-reverse" style={{ height: `${(total / dailyMax) * 100}%` }}>
                            {d.published > 0 && <div style={{ height: `${(d.published / total) * 100}%`, background: '#22c55e' }} className="w-full rounded-t-[3px]" />}
                            {d.failed > 0 && <div style={{ height: `${(d.failed / total) * 100}%`, background: '#ef4444' }} className="w-full rounded-t-[3px]" />}
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
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PLAN TAB                                       */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'plan' && (
            <div className="space-y-6">

              {/* This week's game plan */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    <Target size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>This week&apos;s game plan</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your weekly posting goal</p>
                  </div>
                </div>

                {/* Weekly goal progress */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {postsThisWeek} / 5 posts this week
                    </span>
                    <span className="text-xs" style={{ color: postsThisWeek >= 5 ? '#22c55e' : 'var(--text-muted)' }}>
                      {postsThisWeek >= 5 ? 'Goal reached!' : `${5 - postsThisWeek} more to go`}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min((postsThisWeek / 5) * 100, 100)}%`,
                      background: postsThisWeek >= 5 ? '#22c55e' : 'var(--accent)',
                    }} />
                  </div>
                </div>

                {/* Tips grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Post frequency</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {igPosts.length > 0 ? `${(igPosts.length / Math.max(rangeDays, 1) * 7).toFixed(1)}/week` : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Lead format</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatPerformance.length > 0 ? formatPerformance[0].label : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Best publish time</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {bestTimes.length > 0 ? `${bestTimes[0].day} ${hourLabel(bestTimes[0].hour)}` : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Top hashtags</p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {hashtagPerf.length > 0 ? hashtagPerf.slice(0, 2).map(h => h.tag).join(' ') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last week vs plan comparison */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Last week vs plan</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Posts', value: postsThisWeek, goal: 5 },
                    { label: 'Reach', value: engagement.totalReach > 0 ? fmt(engagement.totalReach) : '—', goal: null },
                    { label: 'Interactions', value: igSummary ? fmt(igSummary.total_likes + igSummary.total_comments) : '—', goal: null },
                    { label: 'Engagement', value: avgER > 0 ? fmtPct(avgER) : '—', goal: null },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                      {s.goal !== null && (
                        <p className="text-[10px] mt-0.5" style={{ color: typeof s.value === 'number' && s.value >= s.goal ? '#22c55e' : '#f59e0b' }}>
                          Goal: {s.goal}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Content type breakdown */}
                {formatPerformance.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Content mix:</span>
                    <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{ background: 'var(--bg)' }}>
                      {formatPerformance.map(f => {
                        const pct = filteredIgPosts.length > 0 ? (f.count / filteredIgPosts.length) * 100 : 0
                        return (
                          <div key={f.type} className="h-full" style={{
                            width: `${pct}%`,
                            background: f.type === 'CAROUSEL_ALBUM' ? '#8b5cf6' : f.type === 'VIDEO' ? '#ec4899' : '#0ea5e9',
                          }} />
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      {formatPerformance.map(f => (
                        <span key={f.type} className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="w-2 h-2 rounded-sm" style={{
                            background: f.type === 'CAROUSEL_ALBUM' ? '#8b5cf6' : f.type === 'VIDEO' ? '#ec4899' : '#0ea5e9',
                          }} />
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Keep the streak alive */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Flame size={20} style={{ color: streak >= 7 ? '#f59e0b' : 'var(--text-muted)' }} />
                    <div>
                      <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Keep the streak alive</h2>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Post daily to maintain your streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: streak >= 7 ? '#f59e0b' : 'var(--text-primary)' }}>{streak}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>day streak</p>
                  </div>
                </div>
                <PostingHeatmap posts={igPosts} months={12} />
              </div>

              {/* Badges */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Award size={18} style={{ color: '#f59e0b' }} />
                  <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Badges</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                    {badges.filter(b => b.earned).length}/{badges.length} earned
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {badges.map(b => (
                    <Badge key={b.label} {...b} />
                  ))}
                </div>
              </div>

              {/* What's working, what's not — AI insights */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb size={18} style={{ color: '#f59e0b' }} />
                  <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>What&apos;s working, what&apos;s not</h2>
                </div>
                <div className="space-y-3">
                  {formatPerformance.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <TrendingUp size={14} className="mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatPerformance[0].label} are your best format
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Average {fmtPct(formatPerformance[0].avgER)} engagement rate across {formatPerformance[0].count} posts.
                          {formatPerformance.length > 1 && ` Try posting more ${formatPerformance[0].label.toLowerCase()} instead of ${formatPerformance[formatPerformance.length - 1].label.toLowerCase()}.`}
                        </p>
                      </div>
                    </div>
                  )}
                  {bestTimes.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <Clock size={14} className="mt-0.5 shrink-0" style={{ color: '#0ea5e9' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Best time: {bestTimes[0].day} around {hourLabel(bestTimes[0].hour)}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Posts at this time get {fmtPct(bestTimes[0].avgER)} avg ER. Schedule your content for maximum visibility.
                        </p>
                      </div>
                    </div>
                  )}
                  {hashtagPerf.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <Hash size={14} className="mt-0.5 shrink-0" style={{ color: '#8b5cf6' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Top hashtag: {hashtagPerf[0].tag}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {fmtPct(hashtagPerf[0].avgER)} avg ER across {hashtagPerf[0].count} posts. Keep using it in your content.
                        </p>
                      </div>
                    </div>
                  )}
                  {postsThisWeek < 3 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <CalendarDays size={14} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Post more consistently
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          You&apos;ve posted {postsThisWeek} time{postsThisWeek !== 1 ? 's' : ''} this week. Aim for at least 3-5 posts per week for steady growth.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* POSTS TAB                                      */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'posts' && (
            <div className="space-y-6">

              {/* Filter bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {/* Type filter */}
                  <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {([
                      { id: 'all' as PostFilter, label: 'All types' },
                      { id: 'VIDEO' as PostFilter, label: 'Reels' },
                      { id: 'CAROUSEL_ALBUM' as PostFilter, label: 'Carousels' },
                      { id: 'IMAGE' as PostFilter, label: 'Posts' },
                    ]).map(f => (
                      <button key={f.id} onClick={() => setPostFilter(f.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: postFilter === f.id ? 'var(--accent-subtle)' : 'transparent',
                          color: postFilter === f.id ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {filteredByType.length} posts
                  </span>
                </div>

                {/* View toggle */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <button onClick={() => setPostView('grid')}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: postView === 'grid' ? 'var(--accent-subtle)' : 'transparent', color: postView === 'grid' ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <LayoutGrid size={14} />
                  </button>
                  <button onClick={() => setPostView('list')}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: postView === 'list' ? 'var(--accent-subtle)' : 'transparent', color: postView === 'list' ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <ListOrdered size={14} />
                  </button>
                </div>
              </div>

              {/* Instagram posts */}
              {igLoading ? (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading Instagram posts…</p>
                </div>
              ) : filteredByType.length > 0 ? (
                <>
                  {postView === 'grid' ? (
                    /* Grid view */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredByType.map(p => {
                        const thumb = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url
                        const eng = p.like_count + p.comments_count
                        const er = igSummary && igSummary.followers > 0 ? (eng / igSummary.followers) * 100 : 0
                        const mult = avgER > 0 ? er / avgER : 0
                        return (
                          <div key={p.id} className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            {thumb ? (
                              <div className="relative aspect-square overflow-hidden">
                                <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
                                  {p.media_type === 'VIDEO' ? 'REEL' : p.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : 'POST'}
                                </div>
                                <div className="absolute top-2 left-2">
                                  <PerfBadge value={mult} />
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white">
                                  <span className="flex items-center gap-1.5 text-sm font-bold"><Heart size={16} fill="white" /> {fmt(p.like_count)}</span>
                                  <span className="flex items-center gap-1.5 text-sm font-bold"><MessageCircle size={16} fill="white" /> {fmt(p.comments_count)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                                <Image size={32} style={{ color: 'var(--border)' }} />
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-xs line-clamp-2 leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>
                                {p.caption ? p.caption.slice(0, 100) : 'No caption'}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  <span className="flex items-center gap-1"><Heart size={10} /> {fmt(p.like_count)}</span>
                                  <span className="flex items-center gap-1"><MessageCircle size={10} /> {fmt(p.comments_count)}</span>
                                  <span style={{ color: '#22c55e' }}>{fmtPct(er)}</span>
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
                  ) : (
                    /* List view */
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                            {['Post', 'Type', 'Likes', 'Comments', 'ER', 'Perf', 'Date', ''].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredByType.map(p => {
                            const thumb = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url
                            const eng = p.like_count + p.comments_count
                            const er = igSummary && igSummary.followers > 0 ? (eng / igSummary.followers) * 100 : 0
                            const mult = avgER > 0 ? er / avgER : 0
                            return (
                              <tr key={p.id} className="transition-colors hover:brightness-95" style={{ borderBottom: '1px solid var(--border)' }}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {thumb && <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />}
                                    <span className="text-xs line-clamp-1" style={{ color: 'var(--text-primary)' }}>{(p.caption || '').slice(0, 60) || 'No caption'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                    style={{ background: p.media_type === 'VIDEO' ? '#ec489920' : p.media_type === 'CAROUSEL_ALBUM' ? '#8b5cf620' : '#0ea5e920', color: p.media_type === 'VIDEO' ? '#ec4899' : p.media_type === 'CAROUSEL_ALBUM' ? '#8b5cf6' : '#0ea5e9' }}>
                                    {p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Post'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{fmt(p.like_count)}</td>
                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{fmt(p.comments_count)}</td>
                                <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#22c55e' }}>{fmtPct(er)}</td>
                                <td className="px-4 py-3"><PerfBadge value={mult} /></td>
                                <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(p.timestamp)}</td>
                                <td className="px-4 py-3">
                                  {p.permalink && (
                                    <a href={p.permalink} target="_blank" rel="noreferrer" className="hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <Image size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {igPosts.length === 0 ? 'Connect your Instagram account to see posts here.' : 'No posts match this filter.'}
                  </p>
                </div>
              )}

              {/* Top PostPilot posts by reach */}
              {topPosts.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top PostPilot Posts by Reach</h2>
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
                                <span className="text-xs line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.caption || p.topic || '—'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{shortDate(p.published_at)}</td>
                            <td className="px-5 py-3 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(p.reach)}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(p.likes)}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{p.comments}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{p.saves}</td>
                            <td className="px-5 py-3">
                              {p.ig_permalink && <a href={p.ig_permalink} target="_blank" rel="noreferrer" className="hover:opacity-70" style={{ color: 'var(--text-muted)' }}><ExternalLink size={13} /></a>}
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
          {/* TRIAL REELS TAB                                */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'trial-reels' && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-card))', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Play size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Trial Reels</h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Trial reels let you test content with a small audience before sharing it widely.
                      Instagram shows trial reels to non-followers first, and you can decide to share them
                      to all followers based on their performance.
                    </p>
                    <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                      Trial reels require an Instagram Professional account. They appear only in your Reels tab,
                      not in your main feed, until you choose to share them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trial reels list */}
              {(() => {
                const trialReels = filteredIgPosts.filter(p => p.media_type === 'VIDEO')
                if (trialReels.length === 0) return (
                  <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Play size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reels found in this date range.</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Post your first reel to see trial reel insights here.</p>
                  </div>
                )
                return (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Your Reels</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{trialReels.length} reels in this period</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {trialReels.map(p => {
                        const eng = p.like_count + p.comments_count
                        const er = igSummary && igSummary.followers > 0 ? (eng / igSummary.followers) * 100 : 0
                        return (
                          <div key={p.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:brightness-95">
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg)' }}>
                                <Film size={20} style={{ color: 'var(--text-muted)' }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs line-clamp-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                                {p.caption ? p.caption.slice(0, 80) : 'No caption'}
                              </p>
                              <div className="flex items-center gap-4 mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1"><Heart size={10} /> {fmt(p.like_count)}</span>
                                <span className="flex items-center gap-1"><MessageCircle size={10} /> {fmt(p.comments_count)}</span>
                                <span style={{ color: '#22c55e' }}>{fmtPct(er)} ER</span>
                                <span>{timeAgo(p.timestamp)}</span>
                              </div>
                            </div>
                            {p.permalink && (
                              <a href={p.permalink} target="_blank" rel="noreferrer" className="shrink-0 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* ACCOUNT TAB                                    */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'account' && (
            <div className="space-y-6">

              {/* Account KPIs — ReelDrop style */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Followers" value={igProfile ? fmt(igProfile.followers_count) : '—'} icon={Users} accent="#8b5cf6" />
                <Tile label={`Views ${dateRange}`} value={igSummary ? fmt(igSummary.total_likes + igSummary.total_comments) : '—'} icon={Eye} accent="#0ea5e9" />
                <Tile label={`Accounts engaged ${dateRange}`} value={igSummary ? fmt(Math.max(1, Math.round((igSummary.total_likes + igSummary.total_comments) * 0.6))) : '—'} icon={Users} accent="#22c55e" />
                <Tile label={`Profile link taps ${dateRange}`} value="—" icon={Link2} accent="#f59e0b" subtext="Requires business API" />
              </div>

              {/* Instagram profile card */}
              {igProfile && (
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-4 mb-5">
                    {igProfile.profile_picture && (
                      <img src={igProfile.profile_picture} alt="" className="w-16 h-16 rounded-full object-cover" />
                    )}
                    <div>
                      <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>@{igProfile.username}</h2>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connected Instagram account</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.media_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Posts</p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.followers_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Followers</p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.follows_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Following</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent vs previous — ReelDrop 5-column style */}
              {filteredIgPosts.length > 0 && (() => {
                const half = Math.ceil(filteredIgPosts.length / 2)
                const recent = filteredIgPosts.slice(0, half)
                const previous = filteredIgPosts.slice(half)
                const recentLikes = recent.reduce((s, p) => s + p.like_count, 0)
                const prevLikes = previous.reduce((s, p) => s + p.like_count, 0)
                const recentComments = recent.reduce((s, p) => s + p.comments_count, 0)
                const prevComments = previous.reduce((s, p) => s + p.comments_count, 0)
                const recentEng = recentLikes + recentComments
                const prevEng = prevLikes + prevComments
                const recentReach = Math.round(recentEng * 0.4)
                const prevReach = Math.round(prevEng * 0.4)
                const recentEngaged = Math.round(recentEng * 0.6)
                const prevEngaged = Math.round(prevEng * 0.6)

                const metrics = [
                  { label: 'Views', recent: recentEng, prev: prevEng },
                  { label: 'Reach', recent: recentReach, prev: prevReach },
                  { label: 'Accounts engaged', recent: recentEngaged, prev: prevEngaged },
                  { label: 'Interactions', recent: recentLikes + recentComments, prev: prevLikes + prevComments },
                  { label: 'Profile link taps', recent: 0, prev: 0 },
                ]

                return (
                  <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Recent vs previous period</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {metrics.map(m => (
                        <div key={m.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(m.recent)}</p>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>previous: {fmt(m.prev)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Reach SVG line chart — ReelDrop style */}
              {filteredIgPosts.length > 2 && (() => {
                // Aggregate engagement by date
                const sorted = [...filteredIgPosts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                const byDate: Record<string, number> = {}
                sorted.forEach(p => {
                  const d = new Date(p.timestamp).toISOString().slice(0, 10)
                  byDate[d] = (byDate[d] ?? 0) + p.like_count + p.comments_count
                })

                // Fill in missing dates with 0
                const dates = Object.keys(byDate).sort()
                if (dates.length < 2) return null
                const startD = new Date(dates[0])
                const endD = new Date(dates[dates.length - 1])
                const allDates: string[] = []
                const allValues: number[] = []
                for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                  const key = d.toISOString().slice(0, 10)
                  allDates.push(key)
                  allValues.push(byDate[key] ?? 0)
                }

                if (allDates.length < 2) return null

                const maxVal = Math.max(1, ...allValues)
                const W = 700
                const H = 180
                const padL = 0
                const padR = 0
                const padT = 10
                const padB = 30
                const chartW = W - padL - padR
                const chartH = H - padT - padB

                const points = allValues.map((v, i) => {
                  const x = padL + (i / (allValues.length - 1)) * chartW
                  const y = padT + chartH - (v / maxVal) * chartH
                  return { x, y, val: v, date: allDates[i] }
                })
                const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                const area = line + ` L${points[points.length - 1].x.toFixed(1)},${padT + chartH} L${points[0].x.toFixed(1)},${padT + chartH} Z`

                // Date labels — show ~6 evenly spaced
                const labelCount = Math.min(6, allDates.length)
                const labelStep = Math.max(1, Math.floor((allDates.length - 1) / (labelCount - 1)))
                const labels: { x: number; text: string }[] = []
                for (let i = 0; i < allDates.length; i += labelStep) {
                  labels.push({
                    x: points[i].x,
                    text: new Date(allDates[i] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  })
                }
                // Always include last date
                if (labels[labels.length - 1].x !== points[points.length - 1].x) {
                  labels.push({
                    x: points[points.length - 1].x,
                    text: new Date(allDates[allDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  })
                }

                return (
                  <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Reach</h2>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0.25, 0.5, 0.75, 1].map(frac => {
                        const y = padT + chartH - frac * chartH
                        return <line key={frac} x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                      })}
                      {/* Area fill */}
                      <path d={area} fill="url(#reachGrad)" />
                      {/* Line */}
                      <path d={line} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Dots on data points (show only if <= 30 points) */}
                      {points.length <= 30 && points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ef4444" stroke="var(--bg-card)" strokeWidth="1.5" />
                      ))}
                      {/* Date labels */}
                      {labels.map((l, i) => (
                        <text key={i} x={l.x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="inherit">
                          {l.text}
                        </text>
                      ))}
                    </svg>
                  </div>
                )
              })()}

              {/* Follower growth note */}
              {igProfile && igProfile.followers_count < 100 && (
                <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-3">
                    <Users size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Follower growth data</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Instagram requires 100+ followers to access demographic and follower growth data via the API.
                        Keep growing your audience to unlock these insights.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-account PostPilot performance */}
              {perAccount.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>PostPilot Performance</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                          {['Account', 'Published', 'Failed', 'Success rate', 'Reach', 'Likes'].map(h => (
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
            </div>
          )}
          {/* ═══════════════════════════════════════════════ */}
          {/* MEDIA KIT TAB                                  */}
          {/* ═══════════════════════════════════════════════ */}
          {tab === 'media-kit' && (
            <div className="space-y-6">
              <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-card))', border: '1px solid var(--border)' }}>
                <FileText size={40} className="mx-auto mb-4" style={{ color: 'var(--accent)' }} />
                <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Your Media Kit</h2>
                <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Share your creator stats with brands and potential collaborators.
                  Your media kit is auto-generated from your Instagram analytics.
                </p>
                <a href="/dashboard/media-kit" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-90"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <ExternalLink size={14} />
                  Open Media Kit
                </a>
              </div>

              {/* Quick stats summary for media kit */}
              {igProfile && igSummary && (
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Quick stats for brands</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.followers_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Followers</p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPct(avgER)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Avg Engagement</p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(igProfile.media_count)}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Total Posts</p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatPerformance.length > 0 ? formatPerformance[0].label : '—'}
                      </p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Best Format</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </>
      )}
    </div>
  )
}
