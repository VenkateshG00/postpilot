'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Image, Settings, LogOut, Instagram,
  CreditCard, BarChart3, Sparkles, ClipboardCheck, Film, Grid3X3, Layers, ChevronDown,
  MoreHorizontal, Zap, Palette, Moon, Sun, MessageSquare, Inbox, Users, Building2, Gift, FileText, PlayCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

/* ── Nav config ──────────────────────────────────────── */
const MAIN_NAV = [
  { href: '/dashboard',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics',  icon: BarChart3 },
  { href: '/dashboard/schedule',  label: 'Schedule',   icon: Calendar },
  { href: '/dashboard/posts',     label: 'Posts',      icon: Image },
]

const AI_TOOLS_NAV = [
  { href: '/dashboard/create',    label: 'Create Post', icon: Sparkles },
  { href: '/dashboard/reels',     label: 'Reels & Stories', icon: Film },
  { href: '/dashboard/carousel',  label: 'Carousel',    icon: Layers },
  { href: '/dashboard/grid',      label: 'Grid Planner', icon: Grid3X3 },
  { href: '/dashboard/approvals', label: 'Approvals',   icon: ClipboardCheck },
  { href: '/dashboard/automations', label: 'Automations',  icon: Zap },
  { href: '/dashboard/inbox',       label: 'Inbox',         icon: Inbox },
  { href: '/dashboard/trial-reels',  label: 'Trial Reels',   icon: PlayCircle },
]

const MANAGE_NAV = [
  { href: '/dashboard/connect',  label: 'Accounts',  icon: Instagram },
  { href: '/dashboard/billing',  label: 'Billing',   icon: CreditCard },
  { href: '/dashboard/referral',  label: 'Referral',   icon: Gift },
  { href: '/dashboard/media-kit',  label: 'Media Kit',  icon: FileText },
  { href: '/dashboard/team',     label: 'Team',      icon: Users },
  { href: '/dashboard/settings', label: 'Settings',  icon: Settings },
]

/* ── Sub-components ──────────────────────────────────── */
function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all font-medium',
        active ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
      )}
      style={active ? { backgroundColor: 'var(--accent)' } : {}}
    >
      <Icon size={15} />
      {label}
    </Link>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-bold tracking-widest uppercase text-gray-600">
      {children}
    </p>
  )
}

/* ── Dark mode toggle (reads / sets data-theme on <html>) ── */
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
      className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
      title={dark ? 'Switch to light' : 'Switch to dark'}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}

/* ── Main Sidebar ─────────────────────────────────────── */
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
  const [acctMenuOpen, setAcctMenuOpen] = useState(false)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)

  const activeAccount = accounts?.find(a => a.id === activeAccountId) ?? accounts?.[0]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const allAiTools = brand?.eligible
    ? [...AI_TOOLS_NAV, { href: '/dashboard/white-label', label: 'White-label', icon: Palette }]
    : AI_TOOLS_NAV

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-full"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-dark)',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">
            {brand?.eligible && brand.name ? brand.name : 'PostPilot'}
          </span>
        </div>
        <DarkModeToggle />
      </div>

      {/* ── Workspace selector ── */}
      {workspaces && workspaces.length > 0 && (
        <div className="px-3 mb-1 relative">
          <button
            onClick={() => setWsMenuOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', opacity: 0.8 }}>
              <Building2 size={12} className="text-white" />
            </div>
            <span className="flex-1 text-left text-xs font-medium text-white truncate">
              {workspaces.find(w => {
                try { const c = document.cookie.match(/active_workspace_id=([^;]+)/); return c && w.id === c[1] } catch { return false }
              })?.name ?? workspaces[0]?.name ?? 'Workspace'}
            </span>
            <ChevronDown size={12} className={cn('text-gray-500 transition-transform', wsMenuOpen && 'rotate-180')} />
          </button>

          {wsMenuOpen && (
            <div
              className="absolute left-3 right-3 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {workspaces.map(w => (
                <button
                  key={w.id}
                  onClick={() => {
                    document.cookie = `active_workspace_id=${w.id}; path=/`
                    setWsMenuOpen(false)
                    router.refresh()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors"
                  style={{ color: '#d1d5db' }}
                >
                  <Building2 size={12} />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Account selector ── */}
      {accounts && accounts.length > 0 && (
        <div className="px-3 mb-1 relative">
          <button
            onClick={() => setAcctMenuOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {activeAccount?.account_name?.[0]?.toUpperCase() ?? 'I'}
            </div>
            <span className="flex-1 text-left text-xs font-medium text-white truncate">
              {activeAccount?.account_name ?? 'My Account'}
            </span>
            <ChevronDown size={12} className={cn('text-gray-500 transition-transform', acctMenuOpen && 'rotate-180')} />
          </button>

          {acctMenuOpen && accounts.length > 1 && (
            <div
              className="absolute left-3 right-3 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    document.cookie = `active_account_id=${a.id}; path=/`
                    setAcctMenuOpen(false)
                    router.refresh()
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {a.account_name?.[0]?.toUpperCase() ?? 'I'}
                  </div>
                  {a.account_name ?? 'Account'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        {MAIN_NAV.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onNavigate} />
        ))}

        <SectionLabel>AI Tools</SectionLabel>
        {allAiTools.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onNavigate} />
        ))}

        <SectionLabel>Manage</SectionLabel>
        {MANAGE_NAV.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onNavigate} />
        ))}
      </nav>

      {/* ── Upgrade CTA ── */}
      <div className="px-3 pb-2">
        {(!profile?.plan || profile.plan === 'free') && (
          <div
            className="rounded-2xl p-4 mb-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255,77,77,0.18) 0%, rgba(255,77,77,0.08) 100%)',
              border: '1px solid rgba(255,77,77,0.25)',
            }}
          >
            <p className="text-xs font-bold text-white mb-0.5">Upgrade to Pro</p>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Unlimited posts &amp; AI features
            </p>
            <Link
              href="/dashboard/billing"
              className="block text-center text-xs font-bold py-2 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Upgrade now →
            </Link>
          </div>
        )}

        {/* ── User row ── */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-gray-500 capitalize">{profile?.plan ?? 'free'} plan</p>
            </div>
            <MoreHorizontal size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Link
                href="/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
              >
                <Settings size={13} className="text-gray-500" />
                Settings
              </Link>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
              >
                <LogOut size={13} className="text-gray-500" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
