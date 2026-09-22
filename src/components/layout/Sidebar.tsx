'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, Image, Settings, LogOut, Instagram, CreditCard, BarChart3, Zap, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import AccountSwitcher from './AccountSwitcher'

const NAV = [
  { href: '/dashboard',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/schedule',  label: 'Schedule',   icon: Calendar },
  { href: '/dashboard/posts',     label: 'Posts',      icon: Image },
  { href: '/dashboard/analytics', label: 'Analytics',  icon: BarChart3 },
  { href: '/dashboard/connect',   label: 'Accounts',   icon: Instagram },
  { href: '/dashboard/billing',   label: 'Billing',    icon: CreditCard },
  { href: '/dashboard/settings',  label: 'Settings',   icon: Settings },
]

export default function Sidebar({ profile, brand, accounts, activeAccountId }: { profile: Profile | null; brand?: { eligible: boolean; name: string | null; logoUrl: string | null; color: string | null } | null; accounts?: { id: string; account_name: string | null; platform: string }[]; activeAccountId?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()

  const nav = brand?.eligible
    ? [...NAV, { href: '/dashboard/white-label', label: 'White-label', icon: Palette }]
    : NAV

  const [logoError, setLogoError] = useState(false)
  const showLogo = !!(brand?.eligible && brand.logoUrl && !logoError)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-100">
        {showLogo ? (
          <img src={brand?.logoUrl || undefined} alt="logo" className="h-8 max-w-[150px] object-contain" onError={() => setLogoError(true)} />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center"
              style={brand?.eligible && brand.color ? { backgroundColor: brand.color } : undefined}>
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">
              {brand?.eligible && brand.name
                ? brand.name
                : <>Post<span className="text-brand-600">Pilot</span></>}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      {accounts && accounts.length >= 2 && (
        <AccountSwitcher accounts={accounts} activeId={activeAccountId ?? null} />
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={16} className={active ? 'text-brand-600' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-semibold text-brand-700">
            {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.plan} plan</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut size={16} className="text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
