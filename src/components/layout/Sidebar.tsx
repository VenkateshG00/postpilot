'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Image, Settings, LogOut,
  Instagram, CreditCard, BarChart3, Zap, Palette,
  Sparkles, ClipboardCheck, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import AccountSwitcher from './AccountSwitcher'

const NAV = [
  { href: '/dashboard',           label: 'Overview',    icon: LayoutDashboard },
  { href: '/dashboard/create',    label: 'Create post', icon: Sparkles },
  { href: '/dashboard/schedule',  label: 'Schedule',    icon: Calendar },
  { href: '/dashboard/posts',     label: 'Posts',       icon: Image },
  { href: '/dashboard/approvals', label: 'Approvals',   icon: ClipboardCheck },
  { href: '/dashboard/analytics', label: 'Analytics',   icon: BarChart3 },
  { href: '/dashboard/connect',   label: 'Accounts',    icon: Instagram },
  { href: '/dashboard/billing',   label: 'Billing',     icon: CreditCard },
  { href: '/dashboard/settings',  label: 'Settings',    icon: Settings },
]

/* ── Dark-mode toggle (reads/writes data-theme on <html>) ── */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.getAttribute('data-theme') === 'dark'
  })
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }
  return { dark, toggle }
}

interface SidebarProps {
  profile: Profile | null
  brand?: {
    eligible: boolean
    name: string | null
    logoUrl: string | null
    color: string | null
  } | null
  accounts?: { id: string; account_name: string | null; platform: string }[]
  activeAccountId?: string | null
}

export default function Sidebar({ profile, brand, accounts, activeAccountId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { dark, toggle } = useDarkMode()
  const [collapsed, setCollapsed] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const nav = brand?.eligible
    ? [...NAV, { href: '/dashboard/white-label', label: 'White-label', icon: Palette }]
    : NAV

  const showLogo = !!(brand?.eligible && brand.logoUrl && !logoError)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()

  return (
    <aside
      style={{
        width: collapsed ? 64 : 232,
        flexShrink: 0,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Logo row */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 20px' : '0 20px',
        borderBottom: '1px solid var(--border)',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        {!collapsed && (
          showLogo ? (
            <img
              src={brand?.logoUrl || undefined}
              alt="logo"
              style={{ height: 28, maxWidth: 140, objectFit: 'contain' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: brand?.eligible && brand.color ? brand.color : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={14} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
                {brand?.eligible && brand.name
                  ? brand.name
                  : <>Post<span style={{ color: 'var(--accent)' }}>Pilot</span></>}
              </span>
            </div>
          )
        )}

        {collapsed && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: brand?.eligible && brand.color ? brand.color : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="white" />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute', top: 20, right: -12, zIndex: 10,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--fg-muted)',
        }}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Account switcher */}
      {!collapsed && accounts && accounts.length >= 2 && (
        <AccountSwitcher accounts={accounts} activeId={activeAccountId ?? null} />
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13, fontWeight: active ? 600 : 400,
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--fg-muted)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--fg)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'
                }
              }}
            >
              <Icon
                size={15}
                color={active ? 'var(--accent)' : 'var(--fg-subtle)'}
                style={{ flexShrink: 0 }}
              />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: dark mode + user */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 12px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--fg-muted)',
            fontSize: 13, width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {dark
            ? <Sun size={15} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
            : <Moon size={15} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />}
          {!collapsed && (dark ? 'Light mode' : 'Dark mode')}
        </button>

        {/* User row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '9px 12px',
          borderRadius: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--accent)',
          }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'User'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: 0, textTransform: 'capitalize' }}>
                {profile?.plan} plan
              </p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 12px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--fg-muted)',
            fontSize: 13, width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={15} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
