'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  caption: string | null
  published_at: string | null
  created_at: string
  ig_permalink: string | null
  status: string
  content_type: string | null
  scheduled_for: string | null
}

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

function getNotifMeta(n: Notification) {
  const ct = n.content_type ?? 'post'

  if (n.status === 'published') {
    const label = ct === 'reel' ? 'Your reel is live'
      : ct === 'carousel' ? 'Your carousel is live'
      : ct === 'story' ? 'Your story is live'
      : 'Your post is live'
    return {
      label,
      iconBg: 'rgba(34, 197, 94, 0.1)',
      iconColor: '#22C55E',
      icon: 'check' as const,
      action: n.ig_permalink ? { label: 'view', href: n.ig_permalink } : null,
      time: n.published_at ?? n.created_at,
    }
  }

  if (n.status === 'scheduled') {
    return {
      label: `${ct === 'reel' ? 'Reel' : ct === 'carousel' ? 'Carousel' : 'Post'} scheduled`,
      iconBg: 'rgba(232, 80, 58, 0.1)',
      iconColor: '#E8503A',
      icon: 'clock' as const,
      action: { label: 'schedule', href: '/dashboard/schedule' },
      time: n.created_at,
    }
  }

  if (n.status === 'failed') {
    return {
      label: 'Post failed to publish',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#EF4444',
      icon: 'alert' as const,
      action: { label: 'details', href: '/dashboard/posts' },
      time: n.created_at,
    }
  }

  return {
    label: 'Post pending approval',
    iconBg: 'rgba(234, 179, 8, 0.1)',
    iconColor: '#EAB308',
    icon: 'pending' as const,
    action: { label: 'review', href: '/dashboard/approvals' },
    time: n.created_at,
  }
}

function NotifIcon({ type, color }: { type: string; color: string }) {
  if (type === 'check') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    )
  }
  if (type === 'clock') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    )
  }
  if (type === 'alert') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    )
  }
  // pending
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

/* Inject keyframe once into <head> */
let keyframeInjected = false
function injectKeyframe() {
  if (keyframeInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = `@keyframes ppNotifDropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`
  document.head.appendChild(style)
  keyframeInjected = true
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
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

      const { data } = await supabase
        .from('post_logs')
        .select('id, caption, published_at, created_at, ig_permalink, status, content_type, scheduled_for')
        .eq('user_id', user.id)
        .in('status', ['published', 'scheduled', 'failed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (!data) return
      setNotifications(data)

      const lastSeen = lastSeenRef.current
      if (lastSeen) {
        const newCount = data.filter(n => n.created_at > lastSeen).length
        setUnreadCount(newCount)
      } else {
        try {
          const stored = localStorage.getItem('pp_notif_last_seen')
          if (stored) {
            lastSeenRef.current = stored
            const newCount = data.filter(n => n.created_at > stored).length
            setUnreadCount(newCount)
          } else {
            if (data.length > 0) {
              lastSeenRef.current = data[0].created_at
              localStorage.setItem('pp_notif_last_seen', data[0].created_at)
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

  // Compute dropdown position when opened
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
      })
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
      const latest = notifications[0].created_at
      lastSeenRef.current = latest
      try { localStorage.setItem('pp_notif_last_seen', latest) } catch {}
      setUnreadCount(0)
    }
  }

  /* ── Dropdown rendered via portal so it escapes sidebar overflow ── */
  const dropdown = open && dropdownPos && mounted
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: 340,
            zIndex: 9999,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            animation: 'ppNotifDropIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Notifications
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const meta = getNotifMeta(n)
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.04))',
                      cursor: 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle, rgba(0,0,0,0.02))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                        background: meta.iconBg,
                      }}
                    >
                      <NotifIcon type={meta.icon} color={meta.iconColor} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {meta.label}
                        </span>
                        {n.status === 'published' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#22C55E">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        )}
                      </div>

                      {/* Caption preview for published posts */}
                      {n.status === 'published' && n.caption && (
                        <p
                          style={{
                            fontSize: 12,
                            marginTop: 2,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: '2px 0 0',
                          }}
                        >
                          {n.caption.slice(0, 80)}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {timeAgo(meta.time)}
                        </span>
                        {meta.action && (
                          <a
                            href={meta.action.href}
                            target={meta.action.href.startsWith('http') ? '_blank' : undefined}
                            rel={meta.action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--accent-brand, #E8503A)',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            {meta.action.label} <span style={{ fontSize: 10 }}>→</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
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
