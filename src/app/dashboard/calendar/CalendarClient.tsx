'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, ExternalLink, X,
  CalendarDays, Plus, LayoutGrid, Rows3,
} from 'lucide-react'

type Post = {
  id: string
  caption: string | null
  image_url: string | null
  topic_used: string | null
  status: string
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  ig_permalink: string | null
  social_account_id: string | null
}

type Props = {
  posts: Post[]
  initialMonth: number
  initialYear: number
}

type ViewMode = 'month' | 'week'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TIME_SLOTS = [
  { label: '6 AM',  hour: 6 },
  { label: '7 AM',  hour: 7 },
  { label: '8 AM',  hour: 8 },
  { label: '9 AM',  hour: 9 },
  { label: '10 AM', hour: 10 },
  { label: '11 AM', hour: 11 },
  { label: '12 PM', hour: 12 },
  { label: '1 PM',  hour: 13 },
  { label: '2 PM',  hour: 14 },
  { label: '3 PM',  hour: 15 },
  { label: '4 PM',  hour: 16 },
  { label: '5 PM',  hour: 17 },
  { label: '6 PM',  hour: 18 },
  { label: '7 PM',  hour: 19 },
  { label: '8 PM',  hour: 20 },
  { label: '9 PM',  hour: 21 },
  { label: '10 PM', hour: 22 },
  { label: '11 PM', hour: 23 },
]

function postDate(p: Post): string | null {
  return p.status === 'published' ? (p.published_at ?? p.created_at) : p.scheduled_for
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function getLocalHour(iso: string): number {
  return parseInt(
    new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }),
    10,
  )
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function statusColors(status: string) {
  if (status === 'published') return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', ring: 'rgba(34,197,94,0.4)', dot: '#22c55e' }
  if (status === 'scheduled') return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', ring: 'rgba(59,130,246,0.4)', dot: '#3b82f6' }
  return { bg: 'rgba(234,179,8,0.12)', color: '#eab308', ring: 'rgba(234,179,8,0.4)', dot: '#eab308' }
}

const cardStyle: React.CSSProperties = {}

/* ── Helper: get the week's date objects (Sun–Sat) containing a given date ── */
function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start)
    dd.setDate(start.getDate() + i)
    return dd
  })
}

export default function CalendarClient({ posts, initialMonth, initialYear }: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('month')
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date())

  /* ── Posts grouped by local date key ── */
  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const p of posts) {
      const d = postDate(p)
      if (!d) continue
      const key = toLocalDateKey(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [posts])

  /* ── Month view data ── */
  const { weeks, todayKey } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayKey = toLocalDateKey(new Date().toISOString())
    const cells: (string | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month, i + 1)
        return toLocalDateKey(d.toISOString())
      }),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (string | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return { weeks, todayKey }
  }, [month, year])

  /* ── Week view data ── */
  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])
  const weekKeys = useMemo(
    () => weekDates.map(d => toLocalDateKey(d.toISOString())),
    [weekDates],
  )
  const todayKeyNow = toLocalDateKey(new Date().toISOString())

  /* ── Navigation ── */
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  function prevWeek() {
    setWeekAnchor(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
    setSelectedDay(null)
  }
  function nextWeek() {
    setWeekAnchor(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
    setSelectedDay(null)
  }
  function goToday() {
    const now = new Date()
    setMonth(now.getMonth())
    setYear(now.getFullYear())
    setWeekAnchor(now)
    setSelectedDay(null)
  }

  const selectedPosts = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  /* ── Week header label ── */
  const weekLabel = `${fmtShortDate(weekDates[0])} – ${fmtShortDate(weekDates[6])}, ${weekDates[6].getFullYear()}`

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">Content <em>calendar</em></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Your scheduled and published posts at a glance
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={14} /> New post
        </Link>
      </div>

      {/* Calendar card */}
      <div className="card overflow-hidden">
        {/* Top bar: nav + view toggle */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 gap-3 flex-wrap"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Left: month/week nav */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={view === 'month' ? prevMonth : prevWeek}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-bold tracking-wide min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>
              {view === 'month' ? `${MONTHS[month]} ${year}` : weekLabel}
            </h2>
            <button
              onClick={view === 'month' ? nextMonth : nextWeek}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={goToday}
              className="hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              Today
            </button>
          </div>

          {/* Right: view toggle */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
          >
            <button
              onClick={() => setView('month')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === 'month' ? 'var(--accent)' : 'transparent',
                color: view === 'month' ? '#fff' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid size={12} /> Month
            </button>
            <button
              onClick={() => setView('week')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === 'week' ? 'var(--accent)' : 'transparent',
                color: view === 'week' ? '#fff' : 'var(--text-muted)',
              }}
            >
              <Rows3 size={12} /> Week
            </button>
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-4 px-4 sm:px-5 py-2.5 text-xs flex-wrap"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22c55e' }} /> Published
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#3b82f6' }} /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#eab308' }} /> Pending
          </span>
        </div>

        {/* ════════ MONTH VIEW ════════ */}
        {view === 'month' && (
          <>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d[0]}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid grid-cols-7"
                  style={{ borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  {week.map((dayKey, di) => {
                    if (!dayKey) return (
                      <div
                        key={di}
                        className="min-h-[70px] sm:min-h-[90px]"
                        style={{
                          background: 'var(--bg)',
                          borderRight: di < 6 ? '1px solid var(--border)' : undefined,
                        }}
                      />
                    )
                    const dayPosts = byDay.get(dayKey) ?? []
                    const isToday = dayKey === todayKey
                    const isSelected = dayKey === selectedDay
                    const dayNum = parseInt(dayKey.split('-')[2])

                    return (
                      <button
                        key={di}
                        onClick={() => setSelectedDay(isSelected ? null : dayKey)}
                        className="relative p-1.5 sm:p-2 text-left h-full min-h-[70px] sm:min-h-[90px] transition-colors group"
                        style={{
                          background: isSelected ? 'rgba(10,10,10,0.04)' : 'transparent',
                          borderRight: di < 6 ? '1px solid var(--border)' : undefined,
                          outline: isSelected ? '2px solid rgba(10,10,10,0.15)' : 'none',
                          outlineOffset: '-2px',
                        }}
                      >
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1"
                          style={{
                            background: isToday ? 'var(--accent)' : 'transparent',
                            color: isToday ? '#fff' : 'var(--text-primary)',
                          }}
                        >
                          {dayNum}
                        </span>

                        {dayPosts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {dayPosts.slice(0, 3).map(p => {
                              const s = statusColors(p.status)
                              return p.image_url ? (
                                <img
                                  key={p.id}
                                  src={p.image_url}
                                  alt=""
                                  className="w-5 h-5 sm:w-7 sm:h-7 rounded object-cover"
                                  style={{ outline: `2px solid ${s.ring}` }}
                                />
                              ) : (
                                <span
                                  key={p.id}
                                  className="w-2.5 h-2.5 rounded-full mt-1"
                                  style={{ background: s.dot }}
                                />
                              )
                            })}
                            {dayPosts.length > 3 && (
                              <span className="text-[10px] self-end leading-none" style={{ color: 'var(--text-muted)' }}>
                                +{dayPosts.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════ WEEK VIEW ════════ */}
        {view === 'week' && (
          <div className="overflow-x-auto">
            {/* Day column headers */}
            <div className="grid min-w-[700px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {/* time gutter */}
              <div style={{ background: 'var(--bg)' }} />
              {weekDates.map((d, i) => {
                const isToday = weekKeys[i] === todayKeyNow
                const dayPosts = byDay.get(weekKeys[i]) ?? []
                return (
                  <div
                    key={i}
                    className="py-3 text-center"
                    style={{
                      borderLeft: '1px solid var(--border)',
                      background: isToday ? 'rgba(10,10,10,0.03)' : 'transparent',
                    }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {DAYS[d.getDay()]}
                    </p>
                    <div
                      className="w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {d.getDate()}
                    </div>
                    {dayPosts.length > 0 && (
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
                        {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time slot rows */}
            <div className="min-w-[700px]">
              {TIME_SLOTS.map((slot, si) => (
                <div
                  key={slot.hour}
                  className="grid"
                  style={{
                    gridTemplateColumns: '60px repeat(7, 1fr)',
                    borderBottom: si < TIME_SLOTS.length - 1 ? '1px solid var(--border)' : undefined,
                    minHeight: 56,
                  }}
                >
                  {/* Time label */}
                  <div
                    className="px-2 py-1.5 text-[11px] font-medium text-right pr-3 shrink-0"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
                  >
                    {slot.label}
                  </div>

                  {/* 7 day columns */}
                  {weekDates.map((d, di) => {
                    const dayKey = weekKeys[di]
                    const isToday = dayKey === todayKeyNow
                    const dayPosts = byDay.get(dayKey) ?? []
                    const slotPosts = dayPosts.filter(p => {
                      const dt = postDate(p)
                      if (!dt) return false
                      return getLocalHour(dt) === slot.hour
                    })

                    return (
                      <div
                        key={di}
                        className="relative p-1"
                        style={{
                          borderLeft: '1px solid var(--border)',
                          background: isToday ? 'rgba(10,10,10,0.02)' : 'transparent',
                        }}
                      >
                        {slotPosts.map(p => {
                          const s = statusColors(p.status)
                          const dt = postDate(p)
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedDay(selectedDay === dayKey ? null : dayKey)}
                              className="w-full rounded-lg p-1.5 text-left mb-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                background: s.bg,
                                border: `1px solid ${s.ring}`,
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                {p.image_url && (
                                  <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold truncate" style={{ color: s.color }}>
                                    {p.caption?.slice(0, 20) || 'Post'}
                                  </p>
                                  <p className="text-[10px] opacity-70" style={{ color: s.color }}>
                                    {dt ? fmtTime(dt) : ''} · {p.status}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )
                        })}

                        {/* Hover plus for empty slots */}
                        {slotPosts.length === 0 && (
                          <Link
                            href="/dashboard/create"
                            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            title="Create post"
                          >
                            <Plus size={12} style={{ color: 'var(--text-muted)' }} />
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No posts empty state (month view only) */}
        {view === 'month' && !posts.length && (
          <div className="px-4 sm:px-6 py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posts yet this month.</p>
            <Link
              href="/dashboard/schedule"
              className="text-sm font-semibold mt-2 inline-block hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Create your first schedule →
            </Link>
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="card mt-4 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarDays size={28} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posts on this day</p>
              <Link
                href="/dashboard/create"
                className="text-xs font-semibold mt-1.5 inline-block hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Create one →
              </Link>
            </div>
          ) : (
            <div>
              {selectedPosts.map((p, i) => {
                const date = postDate(p)
                const s = statusColors(p.status)
                return (
                  <div
                    key={p.id}
                    className="flex gap-3 sm:gap-4 px-4 sm:px-5 py-4"
                    style={{ borderBottom: i < selectedPosts.length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {p.status}
                        </span>
                        {date && (
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(date)}</span>
                        )}
                        {p.topic_used && (
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            · {p.topic_used}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {p.caption || '—'}
                      </p>
                    </div>

                    {p.ig_permalink && (
                      <a
                        href={p.ig_permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start pt-0.5 hover:opacity-70 transition-opacity shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        title="View on Instagram"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
