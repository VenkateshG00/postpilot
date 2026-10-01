'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Image, Settings, LogOut,
  BarChart3, Sparkles, Film, Grid3X3, Layers, Zap,
  Inbox, PlayCircle, Gift, MoreHorizontal, Moon, Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

/* ── Nav config ──────────────────────────────────────── */
const TOP_NAV = [
  { href: '/dashboard',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/schedule',    label: 'Create',        icon: Sparkles },
  { href: '/dashboard/calendar',    label: 'Calendar',      icon: Calendar },
  { href: '/dashboard/grid',        label: 'Grid',          icon: Grid3X3 },
  { href: '/dashboard/automations', label: 'Automations',   icon: Zap },
  { href: '/dashboard/inbox',       label: 'Inbox',         icon: Inbox },
  { href: '/dashboard/analytics',   label: 'Analytics',     icon: BarChart3 },
  { href: '/dashboard/carousel',    label: 'Carousel',      icon: Layers },
  { href: '/dashboard/reels',       label: 'Reels',         icon: Film },
  { href: '/dashboard/trial-reels', label: 'Trial Reels',   icon: PlayCircle },
]

const BOTTOM_NAV = [
  { href: '/dashboard/referral',  label: 'Referral',  icon: Gift },
  { href: '/dashboard/settings',  label: 'Settings',  icon: Settings },
]

/* ── Icon button (single nav item) ── */
function NavIcon({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center w-[44px] h-[38px] rounded-[10px] transition-all',
        active
          ? 'bg-[var(--accent)] text-[var(--bg)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap
        bg-[var(--accent)] text-[var(--bg)] opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </span>
    </Link>
  )
}

/* ── Dark mode toggle ── */
function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.getAttribute('data-theme') === 'dark'
  })
  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-[44px] h-[38px] rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text-primary)] transition-all"
      title={dark ? 'Switch to light' : 'Switch to dark'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

/* ── Main Sidebar (72px icon rail) ── */
export default function Sidebar({
  profile,
  brand,
  accounts,
  activeAccountId,
  workspaces,
  onNavigate,
}: {
  profile: Profile | null
  brand?: { eligible: boolean; name: string | null; logoUrl: string | null; color: string | null } | null
  accounts?: { id: string; account_name: string | null; platform: string }[]
  activeAccountId?: string | null
  workspaces?: { id: string; name: string; owner_id: string }[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside
      className="w-[72px] shrink-0 flex flex-col h-screen sticky top-0 items-center py-4 px-2 gap-1"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Logo ── */}
      <Link href="/dashboard" className="mb-3 flex items-center justify-center">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-brand)' }}
        >
          <Zap size={18} className="text-white" />
        </div>
      </Link>

      {/* ── Account avatar / workspace switcher ── */}
      {accounts && accounts.length > 0 && (
        <div className="mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white">
            {accounts.find(a => a.id === activeAccountId)?.account_name?.[0]?.toUpperCase() ?? 'P'}
          </div>
        </div>
      )}

      {/* ── Top nav icons ── */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto">
        {TOP_NAV.map(item => (
          <NavIcon key={item.href} {...item} active={isActive(item.href)} onClick={onNavigate} />
        ))}
      </nav>

      {/* ── Bottom icons ── */}
      <div className="flex flex-col items-center gap-0.5 mt-auto pt-2">
        {BOTTOM_NAV.map(item => (
          <NavIcon key={item.href} {...item} active={isActive(item.href)} onClick={onNavigate} />
        ))}
        <DarkModeToggle />

        {/* ── User avatar / menu ── */}
        <div className="relative mt-1">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="group relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
            style={{ background: 'var(--accent-brand)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl overflow-hidden shadow-xl z-50 min-w-[160px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                    {profile?.plan ?? 'free'} plan
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Settings size={13} style={{ color: 'var(--text-muted)' }} />
                  Settings
                </Link>
                <div style={{ height: '1px', background: 'var(--border)' }} />
                <button
                  onClick={signOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <LogOut size={13} style={{ color: 'var(--text-muted)' }} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── More options ── */}
        <button
          className="flex items-center justify-center w-[44px] h-[38px] rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text-primary)] transition-all mt-0.5"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </aside>
  )
}
