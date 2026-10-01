'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Grid3X3, Zap, Inbox, BarChart3,
  Layers, Settings, LogOut, Sparkles, Gift, ChevronDown,
  CreditCard, Moon, Sun, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

/* ── Nav sections matching ReelDrop layout ── */
const MAIN_NAV = [
  { href: '/dashboard/schedule',    label: 'Create',        icon: Sparkles },
  { href: '/dashboard/calendar',    label: 'Calendar',      icon: Calendar },
  { href: '/dashboard/grid',        label: 'Grid',          icon: Grid3X3, badge: 'NEW' },
  { href: '/dashboard/automations', label: 'Automations',   icon: Zap },
  { href: '/dashboard/inbox',       label: 'Inbox',         icon: Inbox },
  { href: '/dashboard/analytics',   label: 'Analytics',     icon: BarChart3 },
]

const AI_TOOLS_NAV = [
  { href: '/dashboard/carousel',    label: 'Carousel lab',  icon: Layers },
]

const EARN_NAV = [
  { href: '/dashboard/referral',    label: 'Rewards',       icon: Gift },
]

/* ── Single nav link (icon + text) ── */
function NavItem({ href, label, icon: Icon, active, badge, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; badge?: string; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-all w-full',
        active
          ? 'bg-[var(--accent)] text-[var(--bg)] font-medium'
          : 'text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]'
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.6} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-brand)] text-white leading-none">
          {badge}
        </span>
      )}
    </Link>
  )
}

/* ── Section header (e.g. "AI TOOLS", "EARN") ── */
function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[1.5px]"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </div>
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
      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm w-full text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] transition-all"
    >
      {dark ? <Sun size={18} strokeWidth={1.6} className="shrink-0" /> : <Moon size={18} strokeWidth={1.6} className="shrink-0" />}
      <span>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}

/* ── Main Sidebar (264px text sidebar matching ReelDrop) ── */
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
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const activeAccount = accounts?.find(a => a.id === activeAccountId)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside
      className="w-[264px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        padding: '24px 16px',
      }}
    >
      {/* ── Logo + Brand ── */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1 mb-5" onClick={onNavigate}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-brand)' }}
        >
          <Zap size={18} className="text-white" />
        </div>
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {brand?.name || 'PostPilot'}
        </span>
      </Link>

      {/* ── Account selector dropdown ── */}
      {accounts && accounts.length > 0 && (
        <div className="relative mb-4">
          <button
            onClick={() => setAccountDropdownOpen(o => !o)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] hover:bg-[var(--accent-subtle)] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {activeAccount?.account_name?.[0]?.toUpperCase() ?? 'P'}
            </div>
            <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              @{activeAccount?.account_name || 'Account'}
            </span>
            <ChevronDown size={14} className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }} />
          </button>

          {accountDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAccountDropdownOpen(false)} />
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setAccountDropdownOpen(false)
                      // Switch account logic
                      document.cookie = `active_account=${acc.id};path=/;max-age=31536000`
                      router.refresh()
                    }}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors hover:bg-[var(--accent-subtle)]',
                      acc.id === activeAccountId ? 'font-medium' : ''
                    )}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {acc.account_name?.[0]?.toUpperCase() ?? 'P'}
                    </div>
                    @{acc.account_name || 'Account'}
                    {acc.id === activeAccountId && (
                      <span className="ml-auto text-[var(--accent-brand)]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Dashboard link ── */}
      <NavItem
        href="/dashboard"
        label="Dashboard"
        icon={LayoutDashboard}
        active={isActive('/dashboard') && pathname === '/dashboard'}
        onClick={onNavigate}
      />

      {/* ── Main nav ── */}
      <nav className="flex flex-col gap-0.5 mt-0.5">
        {MAIN_NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* ── AI Tools section ── */}
      <SectionHeader label="AI Tools" />
      <nav className="flex flex-col gap-0.5">
        {AI_TOOLS_NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* ── Earn section ── */}
      <SectionHeader label="Earn" />
      <nav className="flex flex-col gap-0.5">
        {EARN_NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* ── Spacer ── */}
      <div className="flex-1 min-h-4" />

      {/* ── Bottom CTAs ── */}
      <div className="flex flex-col gap-1.5">
        {/* Refer & Earn CTA */}
        <Link
          href="/dashboard/referral"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(232,80,58,0.08), rgba(232,80,58,0.15))',
            color: 'var(--accent-brand)',
          }}
        >
          <Gift size={16} strokeWidth={1.8} className="shrink-0" />
          Refer &amp; earn
        </Link>

        {/* Upgrade CTA */}
        <Link
          href="/dashboard/settings?tab=billing"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm transition-all hover:bg-[var(--accent-subtle)]"
          style={{ color: 'var(--accent-brand)' }}
        >
          <Star size={16} strokeWidth={1.8} className="shrink-0" />
          Upgrade plan
        </Link>

        {/* Buy credits */}
        <Link
          href="/dashboard/settings?tab=credits"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm transition-all text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]"
        >
          <CreditCard size={16} strokeWidth={1.6} className="shrink-0" />
          Buy image credits
        </Link>

        {/* Settings */}
        <NavItem
          href="/dashboard/settings"
          label="Settings"
          icon={Settings}
          active={isActive('/dashboard/settings')}
          onClick={onNavigate}
        />

        {/* Dark mode */}
        <DarkModeToggle />

        {/* ── User avatar + name ── */}
        <div className="relative mt-1">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-[10px] hover:bg-[var(--accent-subtle)] transition-all"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
              style={{ background: 'var(--accent-brand)' }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>
                {profile?.full_name || 'User'}
              </span>
              <span className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
                {profile?.plan ?? 'free'} plan
              </span>
            </div>
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute bottom-full left-0 mb-2 rounded-xl overflow-hidden shadow-xl z-50 w-full"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={signOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
