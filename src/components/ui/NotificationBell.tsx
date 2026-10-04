'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface PostLog {
  id: string
  caption: string | null
  published_at: string | null
  created_at: string
  ig_permalink: string | null
  status: string
  content_type: string | null
  scheduled_for: string | null
}

interface Schedule {
  id: string
  name: string | null
  frequency: string | null
  post_times: string[] | null
  content_type: string | null
  is_active: boolean
}

interface NotifItem {
  id: string
  type: 'published' | 'scheduled' | 'failed' | 'pending' | 'suggestion'
  title: string
  description: string | null
  time: string
  actionLabel: string | null
  actionHref: string | null
  contentType: string
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hr = h % 12 || 12
  return m === 0 ? `${hr}${ampm}` : `${hr}:${String(m).padStart(2, '0')}${ampm}`
}

function contentLabel(ct: string): string {
  if (ct === 'reel') return 'reel'
  if (ct === 'carousel') return 'carousel'
  if (ct === 'story') return 'story'
  return 'photo post'
}

function buildNotifications(posts: PostLog[], schedules: Schedule[]): NotifItem[] {
  const items: NotifItem[] = []

  // Use start-of-today as a stable timestamp for suggestions so unread count
  // doesn't keep resetting every time the 30s poll re-runs buildNotifications.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const stableSugTime = todayStart.toISOString()

  // Build schedule suggestion notifications
  const activeSchedules = schedules.filter(s => s.is_active && s.post_times?.length)
  if (activeSchedules.length > 0) {
    let totalPosts = 0
    const timeLabels: string[] = []
    const types: string[] = []

    for (const s of activeSchedules) {
      const times = s.post_times ?? []
      totalPosts += times.length
      for (const t of times) {
        timeLabels.push(formatTime12(t))
      }
      types.push(contentLabel(s.content_type ?? 'post'))
    }

    if (totalPosts === 1) {
      const ct = types[0]
      items.push({
        id: `sug-${activeSchedules[0].id}`,
        type: 'suggestion',
        title: `Your plan suggests a ${ct} around ${timeLabels[0]} today`,
        description: `Today's plan suggests a ${ct} around ${timeLabels[0]} and nothing is scheduled for it yet. Posting consistently helps grow your reach.`,
        time: stableSugTime,
        actionLabel: 'schedule',
        actionHref: '/dashboard/schedule',
        contentType: types[0] === 'reel' ? 'reel' : 'post',
      })
    } else if (totalPosts > 1) {
      const typesList = [...new Set(types)]
      const typesStr = typesList.length === 1 ? `${typesList[0]}s` : 'posts'
      const descParts = activeSchedules.map((s, i) => {
        const ct = contentLabel(s.content_type ?? 'post')
        const t = (s.post_times ?? [])[0]
        return `a ${ct} around ${t ? formatTime12(t) : timeLabels[i] ?? timeLabels[0]}`
      }).slice(0, 2)
      items.push({
        id: 'sug-multi',
        type: 'suggestion',
        title: `Your plan suggests ${totalPosts} ${typesStr} today`,
        description: `Today's plan suggests ${descParts.join(' and ')}. Nothing is scheduled yet.`,
        time: stableSugTime,
        actionLabel: 'schedule',
        actionHref: '/dashboard/schedule',
        contentType: 'post',
      })
    }
  }

  // Build post log notifications
  for (const p of posts) {
    const ct = contentLabel(p.content_type ?? 'post')
    const ctCap = ct.charAt(0).toUpperCase() + ct.slice(1)

    if (p.status === 'published') {
      items.push({
        id: p.id,
        type: 'published',
        title: `Your ${ct} is live`,
        description: p.caption ? p.caption.slice(0, 100) : null,
        time: p.published_at ?? p.created_at,
        actionLabel: p.ig_permalink ? 'view' : null,
        actionHref: p.ig_permalink,
        contentType: p.content_type ?? 'post',
      })
    } else if (p.status === 'scheduled') {
      const when = p.scheduled_for
        ? `for ${new Date(p.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
        : ''
      items.push({
        id: p.id,
        type: 'scheduled',
        title: `${ctCap} scheduled ${when}`,
        description: p.caption ? p.caption.slice(0, 100) : null,
        time: p.created_at,
        actionLabel: 'schedule',
        actionHref: '/dashboard/schedule',
        contentType: p.content_type ?? 'post',
      })
    } else if (p.status === 'failed') {
      items.push({
        id: p.id,
        type: 'failed',
        title: `${ctCap} failed to publish`,
        description: 'Something went wrong during publishing. Check your connection and try again.',
        time: p.created_at,
        actionLabel: 'details',
        actionHref: '/dashboard/posts',
        contentType: p.content_type ?? 'post',
      })
    } else if (p.status === 'pending_approval') {
      items.push({
        id: p.id,
        type: 'pending',
        title: `${ctCap} pending approval`,
        description: p.caption ? p.caption.slice(0, 100) : null,
        time: p.created_at,
        actionLabel: 'review',
        actionHref: '/dashboard/approvals',
        contentType: p.content_type ?? 'post',
      })
    } else if (p.status === 'pending') {
      items.push({
        id: p.id,
        type: 'scheduled',
        title: `${ctCap} is processing`,
        description: p.caption ? p.caption.slice(0, 100) : 'Your post is being prepared for publishing.',
        time: p.created_at,
        actionLabel: 'details',
        actionHref: '/dashboard/posts',
        contentType: p.content_type ?? 'post',
      })
    }
  }

  // Sort by time descending and cap at exactly 5
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return items.slice(0, 5)
}

/* ─── Notification icon per type ────────────────────────────────────────────── */
const NOTIF_STYLES: Record<string, { bg: string; color: string }> = {
  published:  { bg: 'rgba(34, 197, 94, 0.1)',  color: '#22C55E' },
  scheduled:  { bg: 'rgba(232, 80, 58, 0.1)',  color: '#E8503A' },
  suggestion: { bg: 'rgba(232, 80, 58, 0.08)', color: '#E8503A' },
  failed:     { bg: 'rgba(239, 68, 68, 0.1)',  color: '#EF4444' },
  pending:    { bg: 'rgba(234, 179, 8, 0.1)',  color: '#EAB308' },
}

function NotifIcon({ type }: { type: string }) {
  const s = NOTIF_STYLES[type] ?? NOTIF_STYLES.pending
  if (type === 'published') {
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.bg }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      </div>
    )
  }
  if (type === 'suggestion' || type === 'scheduled') {
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.bg }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
    )
  }
  if (type === 'failed') {
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.bg }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
    )
  }
  // pending
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.bg }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    </div>
  )
}

/* ─── Inject keyframe once ──────────────────────────────────────────────────── */
let keyframeInjected = false
function injectKeyframe() {
  if (keyframeInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = `@keyframes ppNotifSlideIn{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`
  document.head.appendChild(style)
  keyframeInjected = true
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NotificationBell — portal-based dropdown inspired by Reeldrop
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSeenRef = useRef<string | null>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    injectKeyframe()
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch post logs + active schedules in parallel
      const [postsRes, schedRes] = await Promise.all([
        supabase
          .from('post_logs')
          .select('id, caption, published_at, created_at, ig_permalink, status, content_type, scheduled_for')
          .eq('user_id', user.id)
          .in('status', ['published', 'scheduled', 'failed', 'pending', 'pending_approval'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('schedules')
          .select('id, name, frequency, post_times, content_type, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(10),
      ])

      const posts = postsRes.data ?? []
      const schedules = schedRes.data ?? []
      const items = buildNotifications(posts, schedules)
      setNotifications(items)

      // Unread tracking
      const latestTime = items.length > 0 ? items[0].time : null
      const lastSeen = lastSeenRef.current
      if (lastSeen) {
        const newCount = items.filter(n => n.time > lastSeen).length
        setUnreadCount(newCount)
      } else {
        try {
          const stored = localStorage.getItem('pp_notif_last_seen')
          if (stored) {
            lastSeenRef.current = stored
            const newCount = items.filter(n => n.time > stored).length
            setUnreadCount(newCount)
          } else {
            if (latestTime) {
              lastSeenRef.current = latestTime
              localStorage.setItem('pp_notif_last_seen', latestTime)
            }
            setUnreadCount(0)
          }
        } catch {
          setUnreadCount(0)
        }
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Position dropdown when opened
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect()
      const dropW = 370
      let left = rect.left
      if (left + dropW > window.innerWidth - 12) {
        left = window.innerWidth - dropW - 12
      }
      setDropdownPos({ top: rect.bottom + 10, left })
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleOpen() {
    setOpen(o => !o)
    if (!open && notifications.length > 0) {
      const latest = notifications[0].time
      lastSeenRef.current = latest
      try { localStorage.setItem('pp_notif_last_seen', latest) } catch {}
      setUnreadCount(0)
    }
  }

  /* ── Dropdown via portal ────────────────────────────────────────────────── */
  const dropdown = open && dropdownPos && mounted
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: 370,
            zIndex: 9999,
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border, #e5e5e5)',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            animation: 'ppNotifSlideIn 0.2s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px 12px',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary, #111)',
              borderBottom: '1px solid var(--border, #e5e5e5)',
            }}
          >
            Notifications
          </div>

          {/* List */}
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  fontSize: 14,
                  color: 'var(--text-muted, #888)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #ccc)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                No notifications yet
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 20px',
                    borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-light, rgba(0,0,0,0.05))' : 'none',
                    cursor: 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle, rgba(0,0,0,0.02))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Icon */}
                  <div style={{ paddingTop: 2 }}>
                    <NotifIcon type={n.type} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary, #111)',
                        lineHeight: '1.4',
                      }}>
                        {n.title}
                      </span>
                      {n.type === 'published' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#22C55E" style={{ flexShrink: 0 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>

                    {/* Description */}
                    {n.description && (
                      <p style={{
                        fontSize: 13,
                        lineHeight: '1.5',
                        margin: '4px 0 0',
                        color: 'var(--text-muted, #666)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                        {n.description}
                      </p>
                    )}

                    {/* Time + action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #999)' }}>
                        {timeAgo(n.time)}
                      </span>
                      {n.actionLabel && n.actionHref && (
                        <a
                          href={n.actionHref}
                          target={n.actionHref.startsWith('http') ? '_blank' : undefined}
                          rel={n.actionHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--accent-brand, #E8503A)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {n.actionLabel} <span style={{ fontSize: 11 }}>&#8594;</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={bellRef}
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={1.6} style={{ color: 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ background: 'var(--accent-brand, #E8503A)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </>
  )
}
