'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CreditCard, Users, Image, Instagram, Settings, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/plans',     label: 'Plans',     icon: CreditCard },
  { href: '/admin/clients',   label: 'Clients',   icon: Users },
  { href: '/admin/posts',     label: 'Posts',     icon: Image },
  { href: '/admin/accounts',  label: 'Accounts',  icon: Instagram },
  { href: '/admin/settings',  label: 'Settings',  icon: Settings },
]

export default function AdminSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">
            Post<span className="text-brand-600">Pilot</span>
          </span>
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
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

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-semibold text-brand-700">
            {profile?.full_name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'Superadmin'}</p>
            <p className="text-xs text-gray-400">Super Admin</p>
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
