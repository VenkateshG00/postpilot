"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, ExternalLink, X,
  CalendarDays, Plus, LayoutGrid, Rows3,
  Image, Film, CircleDot, Layers,
  Filter, Check, Clock, Edit3,
} from "lucide-react"

type Post = {
  id: string
  caption: string | null
  image_url: string | null
  topic_used: string | null
  status: string
  content_type?: string | null
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  ig_permalink: string | null
  social_account_id: string | null
}

type Props = { posts: Post[]; initialMonth: number; initialYear: number }
type ViewMode = "month" | "week"
type ContentFilter = "all" | "post" | "reel" | "story" | "carousel"
type StatusFilter = "all" | "published" | "scheduled" | "pending" | "failed"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = (i + 1) % 24
  const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`
  return { label, hour }
})

const CONTENT_TYPES: { value: ContentFilter; label: string; icon: typeof Image }[] = [
  { value: "all", label: "All types", icon: Layers },
  { value: "post", label: "Post", icon: Image },
  { value: "reel", label: "Reel", icon: Film },
  { value: "story", label: "Story", icon: CircleDot },
  { value: "carousel", label: "Carousel", icon: Layers },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: "all", label: "All statuses", color: "#737373" },
  { value: "published", label: "Published", color: "#22c55e" },
  { value: "scheduled", label: "Scheduled", color: "#3b82f6" },
  { value: "pending", label: "Pending", color: "#eab308" },
  { value: "failed", label: "Failed", color: "#ef4444" },
]

function postDate(p: Post): string | null {
  return p.status === "published" ? (p.published_at ?? p.created_at) : p.scheduled_for
}
function toLocalDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}
function getLocalHour(iso: string): number {
  return parseInt(new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }), 10)
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
}
function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function statusColors(status: string) {
  switch (status) {
    case "published": return { bg: "rgba(34,197,94,0.10)", color: "#22c55e", ring: "rgba(34,197,94,0.3)", dot: "#22c55e", label: "Published" }
    case "scheduled": return { bg: "rgba(59,130,246,0.10)", color: "#3b82f6", ring: "rgba(59,130,246,0.3)", dot: "#3b82f6", label: "Scheduled" }
    case "failed": return { bg: "rgba(239,68,68,0.10)", color: "#ef4444", ring: "rgba(239,68,68,0.3)", dot: "#ef4444", label: "Failed" }
    default: return { bg: "rgba(234,179,8,0.10)", color: "#eab308", ring: "rgba(234,179,8,0.3)", dot: "#eab308", label: "Pending" }
  }
}

function contentTypeIcon(type?: string | null) {
  switch (type) {
    case "reel": return { icon: Film, label: "Reel" }
    case "story": return { icon: CircleDot, label: "Story" }
    case "carousel": return { icon: Layers, label: "Carousel" }
    default: return { icon: Image, label: "Post" }
  }
}

function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor)
  const dayOfWeek = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - dayOfWeek)
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(start); dd.setDate(start.getDate() + i); return dd })
}

/* Post Detail Popover */
function PostDetailPopover({ post, onClose }: { post: Post; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const date = postDate(post)
  const s = statusColors(post.status)
  const ct = contentTypeIcon(post.content_type)
  const TypeIcon = ct.icon

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
      <div ref={ref} className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
              <TypeIcon size={11} />
              {ct.label}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        {post.image_url && (
          <div style={{ background: "#000" }}>
            <img src={post.image_url} alt="" className="w-full object-contain" style={{ maxHeight: 280 }} />
          </div>
        )}
        <div className="px-5 py-4">
          {date && (
            <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <Clock size={12} />
              {new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
              {" · "}
              {fmtTime(date)}
            </div>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {post.caption || "No caption"}
          </p>
          {post.topic_used && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Topic: {post.topic_used}</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          {post.ig_permalink && (
            <a href={post.ig_permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: "var(--accent)", color: "#fff" }}>
              <ExternalLink size={12} /> Open in Instagram
            </a>
          )}
          <Link href="/dashboard/create" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            <Edit3 size={12} /> Edit
          </Link>
        </div>
      </div>
    </div>
  )
}

/* Month Event Card */
function MonthEventCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const date = postDate(post)
  const s = statusColors(post.status)
  const ct = contentTypeIcon(post.content_type)
  const TypeIcon = ct.icon
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} className="w-full flex items-center gap-1.5 p-1 rounded-md text-left transition-all hover:scale-[1.01]" style={{ background: s.bg }}>
      {post.image_url ? (
        <img src={post.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center" style={{ background: s.ring }}>
          <TypeIcon size={10} style={{ color: s.color }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: s.color }}>
          {date ? fmtTime(date) : ""} {"·"} {ct.label}
        </p>
        <p className="text-[10px] truncate leading-tight" style={{ color: "var(--text-muted)" }}>
          {post.caption?.slice(0, 30) || "No caption"}
        </p>
      </div>
    </button>
  )
}

/* ======== MAIN COMPONENT ======== */
export default function CalendarClient({ posts, initialMonth, initialYear }: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [view, setView] = useState<ViewMode>("month")
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date())
  const [detailPost, setDetailPost] = useState<Post | null>(null)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (contentFilter !== "all" && (p.content_type || "post") !== contentFilter) return false
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      return true
    })
  }, [posts, contentFilter, statusFilter])

  const activeFilterCount = (contentFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const p of filteredPosts) {
      const d = postDate(p)
      if (!d) continue
      const key = toLocalDateKey(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    for (const [, arr] of map) arr.sort((a, b) => (postDate(a) || "").localeCompare(postDate(b) || ""))
    return map
  }, [filteredPosts])

  const { weeks, todayKey } = useMemo(() => {
    const firstDayRaw = new Date(year, month, 1).getDay()
    const firstDay = (firstDayRaw + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayKey = toLocalDateKey(new Date().toISOString())
    const cells: (string | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => toLocalDateKey(new Date(year, month, i + 1).toISOString())),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (string | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return { weeks, todayKey }
  }, [month, year])

  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])
  const weekKeys = useMemo(() => weekDates.map(d => toLocalDateKey(d.toISOString())), [weekDates])
  const todayKeyNow = toLocalDateKey(new Date().toISOString())

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  function prevWeek() { setWeekAnchor(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d }) }
  function nextWeek() { setWeekAnchor(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d }) }
  function goToday() { const now = new Date(); setMonth(now.getMonth()); setYear(now.getFullYear()); setWeekAnchor(now) }

  const weekLabel = `${fmtShortDate(weekDates[0])} – ${fmtShortDate(weekDates[6])}, ${weekDates[6].getFullYear()}`

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">Content <em>calendar</em></h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Hover any day {"·"} click <strong>+</strong> to schedule
          </p>
        </div>
        <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={14} /> New post
        </Link>
      </div>

      <div className="card overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={view === "month" ? prevMonth : prevWeek} className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:opacity-80" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }} aria-label="Previous"><ChevronLeft size={16} /></button>
            <h2 className="text-sm font-bold tracking-wide min-w-[140px] text-center" style={{ color: "var(--text-primary)" }}>
              {view === "month" ? `${MONTHS[month]} ${year}` : weekLabel}
            </h2>
            <button onClick={view === "month" ? nextMonth : nextWeek} className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:opacity-80" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }} aria-label="Next"><ChevronRight size={16} /></button>
            <button onClick={goToday} className="hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>Today</button>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <div className="relative">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors" style={{ background: activeFilterCount > 0 ? "var(--accent)" : "var(--bg)", color: activeFilterCount > 0 ? "#fff" : "var(--text-muted)", border: activeFilterCount > 0 ? "none" : "1px solid var(--border)" }}>
                <Filter size={12} /> Filters
                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: "rgba(255,255,255,0.3)" }}>{activeFilterCount}</span>}
              </button>
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl z-40 py-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Content type</p>
                  {CONTENT_TYPES.map(ct => { const Icon = ct.icon; const active = contentFilter === ct.value; return (
                    <button key={ct.value} onClick={() => setContentFilter(ct.value)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80 transition-opacity" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>
                      <Icon size={13} /><span className="flex-1 text-left font-medium">{ct.label}</span>{active && <Check size={13} />}
                    </button>
                  )})}
                  <div className="my-1.5" style={{ borderTop: "1px solid var(--border)" }} />
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</p>
                  {STATUS_OPTIONS.map(so => { const active = statusFilter === so.value; return (
                    <button key={so.value} onClick={() => setStatusFilter(so.value)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80 transition-opacity" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: so.color }} /><span className="flex-1 text-left font-medium">{so.label}</span>{active && <Check size={13} />}
                    </button>
                  )})}
                  {activeFilterCount > 0 && (<><div className="my-1.5" style={{ borderTop: "1px solid var(--border)" }} /><button onClick={() => { setContentFilter("all"); setStatusFilter("all") }} className="w-full px-3 py-2 text-xs font-semibold text-left hover:opacity-80" style={{ color: "var(--accent-brand, #e8503a)" }}>Clear all filters</button></>)}
                </div>
              )}
            </div>
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <button onClick={() => setView("month")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors" style={{ background: view === "month" ? "var(--accent)" : "transparent", color: view === "month" ? "#fff" : "var(--text-muted)" }}><LayoutGrid size={12} /> Month</button>
              <button onClick={() => setView("week")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors" style={{ background: view === "week" ? "var(--accent)" : "transparent", color: view === "week" ? "#fff" : "var(--text-muted)" }}><Rows3 size={12} /> Week</button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 sm:px-5 py-2.5 text-xs flex-wrap" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} /> Published</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#3b82f6" }} /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#eab308" }} /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ef4444" }} /> Failed</span>
        </div>

        {/* MONTH VIEW */}
        {view === "month" && (
          <>
            <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
              {DAYS.map(d => (
                <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  <span className="hidden sm:inline">{d}</span><span className="sm:hidden">{d[0]}</span>
                </div>
              ))}
            </div>
            <div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7" style={{ borderBottom: wi < weeks.length - 1 ? "1px solid var(--border)" : undefined }}>
                  {week.map((dayKey, di) => {
                    if (!dayKey) return <div key={di} className="min-h-[90px] sm:min-h-[110px]" style={{ background: "var(--bg)", borderRight: di < 6 ? "1px solid var(--border)" : undefined }} />
                    const dayPosts = byDay.get(dayKey) ?? []
                    const isToday = dayKey === todayKey
                    const isHovered = dayKey === hoveredDay
                    const dayNum = parseInt(dayKey.split("-")[2])
                    return (
                      <div key={di} className="relative p-1.5 sm:p-2 text-left min-h-[90px] sm:min-h-[110px] transition-colors group/day" style={{ borderRight: di < 6 ? "1px solid var(--border)" : undefined, background: isHovered ? "rgba(10,10,10,0.02)" : "transparent" }} onMouseEnter={() => setHoveredDay(dayKey)} onMouseLeave={() => setHoveredDay(null)}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold" style={{ background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#fff" : "var(--text-primary)" }}>{dayNum}</span>
                          <Link href={`/dashboard/create?date=${dayKey}`} className="w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity hover:scale-110" style={{ background: "var(--accent)", color: "#fff" }} title="Schedule for this day"><Plus size={11} strokeWidth={3} /></Link>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {dayPosts.slice(0, 2).map(p => <MonthEventCard key={p.id} post={p} onClick={() => setDetailPost(p)} />)}
                          {dayPosts.length > 2 && <button onClick={() => { if (dayPosts[2]) setDetailPost(dayPosts[2]) }} className="text-[10px] font-semibold pl-1 hover:underline" style={{ color: "var(--accent)" }}>+{dayPosts.length - 2} more</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ background: "var(--bg)" }} />
              {weekDates.map((d, i) => {
                const isToday = weekKeys[i] === todayKeyNow
                const dayPosts = byDay.get(weekKeys[i]) ?? []
                return (
                  <div key={i} className="py-3 text-center" style={{ borderLeft: "1px solid var(--border)", background: isToday ? "rgba(10,10,10,0.03)" : "transparent" }}>
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{DAYS[i]}</p>
                    <div className="w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold" style={{ background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#fff" : "var(--text-primary)" }}>{d.getDate()}</div>
                    {dayPosts.length > 0 && <p className="text-[10px] mt-1 font-semibold" style={{ color: "var(--accent)" }}>{dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}</p>}
                  </div>
                )
              })}
            </div>
            <div className="min-w-[700px]">
              {TIME_SLOTS.map((slot, si) => (
                <div key={slot.hour} className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: si < TIME_SLOTS.length - 1 ? "1px solid var(--border)" : undefined, minHeight: 52 }}>
                  <div className="px-2 py-1.5 text-[11px] font-medium text-right pr-3 shrink-0" style={{ color: "var(--text-muted)", background: "var(--bg)", borderRight: "1px solid var(--border)" }}>{slot.label}</div>
                  {weekDates.map((d, di) => {
                    const dayKey = weekKeys[di]
                    const isToday = dayKey === todayKeyNow
                    const dayPosts = byDay.get(dayKey) ?? []
                    const slotPosts = dayPosts.filter(p => { const dt = postDate(p); if (!dt) return false; return getLocalHour(dt) === slot.hour })
                    return (
                      <div key={di} className="relative p-1 group/slot" style={{ borderLeft: "1px solid var(--border)", background: isToday ? "rgba(10,10,10,0.02)" : "transparent" }}>
                        {slotPosts.map(p => {
                          const s = statusColors(p.status); const ct = contentTypeIcon(p.content_type); const TypeIcon = ct.icon; const dt = postDate(p)
                          return (
                            <button key={p.id} onClick={() => setDetailPost(p)} className="w-full rounded-lg p-1.5 text-left mb-1 transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: s.bg, border: `1px solid ${s.ring}` }}>
                              <div className="flex items-center gap-1.5">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" /> : <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center" style={{ background: s.ring }}><TypeIcon size={10} style={{ color: s.color }} /></div>}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold truncate" style={{ color: s.color }}>{dt ? fmtTime(dt) : ""} {"·"} {ct.label}</p>
                                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{p.caption?.slice(0, 25) || "No caption"}</p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                        {slotPosts.length === 0 && <Link href={`/dashboard/create?date=${dayKey}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity" title="Schedule for this time"><Plus size={12} style={{ color: "var(--text-muted)" }} /></Link>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="px-4 sm:px-6 py-12 text-center">
            <CalendarDays size={32} className="mx-auto mb-3" style={{ color: "var(--border)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{activeFilterCount > 0 ? "No posts match your filters" : "No posts yet"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{activeFilterCount > 0 ? "Try changing or clearing your filters." : "Schedule your first post to see it here."}</p>
            {activeFilterCount > 0 ? (
              <button onClick={() => { setContentFilter("all"); setStatusFilter("all") }} className="text-xs font-semibold mt-3 inline-block hover:underline" style={{ color: "var(--accent)" }}>Clear filters</button>
            ) : (
              <Link href="/dashboard/create" className="text-xs font-semibold mt-3 inline-block hover:underline" style={{ color: "var(--accent)" }}>Create your first post {"→"}</Link>
            )}
          </div>
        )}
      </div>

      {detailPost && <PostDetailPopover post={detailPost} onClose={() => setDetailPost(null)} />}
      {showFilters && <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />}
    </div>
  )
}
