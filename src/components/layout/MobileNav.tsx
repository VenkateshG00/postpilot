'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  brand?: { eligible: boolean; name: string | null; logoUrl: string | null; color: string | null } | null
  accounts?: { id: string; account_name: string | null; platform: string }[]
  activeAccountId?: string | null
  workspaces?: { id: string; name: string; owner_id: string }[]
}

export default function MobileNav({ profile, brand, accounts, activeAccountId, workspaces }: Props) {
  const [open, setOpen] = useState(false)

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-dark)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">
            {brand?.eligible && brand.name ? brand.name : 'PostPilot'}
          </span>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile spacer (so content isn't under top bar) */}
      <div className="md:hidden h-14 shrink-0" />

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 transition-transform duration-300"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          background: 'var(--bg-sidebar)',
        }}
      >
        <Sidebar
          profile={profile}
          brand={brand}
          accounts={accounts}
          activeAccountId={activeAccountId}
          workspaces={workspaces}
          onNavigate={() => setOpen(false)}
        />
      </div>
    </>
  )
}
