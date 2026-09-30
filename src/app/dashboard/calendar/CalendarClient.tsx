'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ExternalLink, X, CalendarDays, Plus } from 'lucide-react'

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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function postDate(p: Post): string | null {
  return p.status === 'published' ? (p.published_at ?? p.created_at) : p.scheduled_for
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function statusColors(status: string) {
  if (status === 'published') return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', ring: 'rgba(34,197,94,0.4)', dot: '#22c55e' }
  if (status === 'scheduled') return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', ring: 'rgba(59,130,246,0.4)', dot: '#3b82f6' }
  return { bg: 'rgba(234,179,8,0.12)', color: '#eab308', ring: 'rgba(234,179,8,0.4)', dot: '#eab308' }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

export default function CalendarClient({ posts, initialMonth, initialYear }: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  const selectedPosts = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Content calendar</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Your scheduled and published posts at a glance
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={14} /> New post
        </Link>
      </div>

      {/* Calendar card */}
      <div className="overflow-hidden" style={cardStyle}>
        {/* Month nav */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:opacity-80"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:opacity-80"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-xs"
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

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
          {DAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7"
              style={{ borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : undefined, minHeight: 90 }}
            >
              {week.map((dayKey, di) => {
                if (!dayKey) return (
                  <div
                    key={di}
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
                    className="relative p-2 text-left h-full min-h-[90px] transition-colors group"
                    style={{
                      background: isSelected ? 'rgba(255,77,77,0.06)' : 'transparent',
                      borderRight: di < 6 ? '1px solid var(--border)' : undefined,
                      outline: isSelected ? '2px solid rgba(255,77,77,0.3)' : 'none',
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
                              className="w-7 h-7 rounded object-cover"
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
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-4 overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
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
                    className="flex gap-4 px-5 py-4"
                    style={{ borderBottom: i < selectedPosts.length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
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
