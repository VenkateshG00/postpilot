'use client'

import { useRouter } from 'next/navigation'

interface Acct { id: string; account_name: string | null; platform: string }

export default function AccountSwitcher({ accounts, activeId }: { accounts: Acct[]; activeId: string | null }) {
  const router = useRouter()

  function onChange(v: string) {
    document.cookie = `pp_account=${v}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <div className="px-3 pt-3">
      <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 px-1">Viewing account</label>
      <select
        value={activeId ?? ''}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full text-sm rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <option value="">All accounts</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.account_name || a.platform}</option>
        ))}
      </select>
    </div>
  )
}
