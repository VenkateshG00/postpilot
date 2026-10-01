'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, Calendar, Zap, BarChart3,
  Grid3X3, Inbox, Layers, Film, PlayCircle, Gift, Settings,
  Moon, Sun, LogOut, Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

/* Bottom tab items (show 5 most important) */
const BOTTOM_TABS = [
  { href: '/dashboard',             label: 'Home',        icon: LayoutDashboard },
  { href: '/dashboard/schedule',    label: 'Create',      icon: Sparkles },
  { href: '/dashboard/calendar',    label: 'Calendar',    icon: Calendar },
  { href: '/dashboard/automations', label: 'Auto',        icon: Zap },
]

/* Full nav for drawer */
const FULL_NAV = [
  { href: '/dashboard',             label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/dashboard/schedule',    label: 'Create',      icon: Sparkles },
  { href: '/dashboard/calendar',    label: 'Calendar',    icon: Calendar },
  { href: '/dashboard/grid',        label: 'Grid',        icon: Grid3X3 },
  { href: '/dashboard/automations', label: 'Automations', icon: Zap },
  { href: '/dashboard/inbox',       label: 'Inbox',       icon: Inbox },
  { href: '/dashboard/analytics',   label: 'Analytics',   icon: BarChart3 },
  { href: '/dashboard/carousel',    label: 'Carousel',    icon: Layers },
  { href: '/dashboard/reels',       label: 'Reels',       icon: Film },
  { href: '/dashboard/trial-reels', label: 'Trial Reels', icon: PlayCircle },
  { href: '/dashboard/posts',       label: 'Posts',       icon: Image },
  { href: '/dashboard/referral',    label: 'Referral',    icon: Gift },
  { href: '/dashboard/settings',    label: 'Settings',    icon: Settings },
]

interface Props {
  profile: Profile | null
  brand?: { eligible: boolean; name: string | null; logoUrl: string | null; color: string | null } | null
  accounts?: { id: string; account_name: string | null; platform: string }[]
  activeAccountId?: string | null
  workspaces?: { id: string; name: string; owner_id: string }[]
}

export default function MobileNav({ profile, brand, accounts, activeAccountId }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* ── Bottom tab bar (mobile) ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 h-16 safe-area-pb"
        style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
      >
        {BOTTOM_TABS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
              isActive(item.href)
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            <item.icon size={20} strokeWidth={isActive(item.href) ? 2.2 : 1.6} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        {/* More tab */}
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
            open ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          )}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* ── Mobile bottom spacer ── */}
      <div className="md:hidden h-16 shrink-0" />

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-up drawer ── */}
      <div
        className={cn(
          'md:hidden fixed left-0 right-0 bottom-16 z-50 transition-transform duration-300 rounded-t-2xl max-h-[70vh] overflow-y-auto',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="p-4 space-y-1">
          {/* Account info */}
          {accounts && accounts.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl" style={{ background: 'var(--accent-subtle)' }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white">
                {accounts.find(a => a.id === activeAccountId)?.account_name?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {accounts.find(a => a.id === activeAccountId)?.account_name ?? 'Account'}
                </p>
                <p className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
                  {profile?.plan ?? 'free'} plan
                </p>
              </div>
            </div>
          )}

          {FULL_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive(item.href)
                  ? 'bg-[var(--accent)] text-[var(--bg)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
