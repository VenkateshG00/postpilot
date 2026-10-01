'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  caption: string | null
  published_at: string
  ig_permalink: string | null
  status: string
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSeenRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('post_logs')
        .select('id, caption, published_at, ig_permalink, status')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(20)

      if (!data) return
      setNotifications(data)

      // Count unread
      const lastSeen = lastSeenRef.current
      if (lastSeen) {
        const newCount = data.filter(n => n.published_at > lastSeen).length
        setUnreadCount(newCount)
      } else {
        // First load — read lastSeen from localStorage
        try {
          const stored = localStorage.getItem('pp_notif_last_seen')
          if (stored) {
            lastSeenRef.current = stored
            const newCount = data.filter(n => n.published_at > stored).length
            setUnreadCount(newCount)
          } else {
            // First ever visit — mark all as seen
            if (data.length > 0) {
              lastSeenRef.current = data[0].published_at
              localStorage.setItem('pp_notif_last_seen', data[0].published_at)
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen(o => !o)
    if (!open && notifications.length > 0) {
      // Mark all as read
      const latest = notifications[0].published_at
      lastSeenRef.current = latest
      try { localStorage.setItem('pp_notif_last_seen', latest) } catch {}
      setUnreadCount(0)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
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

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[320px] rounded-xl overflow-hidden shadow-2xl z-50"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 text-sm font-semibold"
            style={{
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Notifications
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--accent-subtle)] transition-colors"
                  style={{ borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.04))' }}
                >
                  {/* Green check icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Your post is live
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#22C55E">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.published_at)}
                      </span>
                      {n.ig_permalink && (
                        <a
                          href={n.ig_permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium flex items-center gap-0.5"
                          style={{ color: 'var(--accent-brand, #E8503A)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          view <span className="text-[10px]">→</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
