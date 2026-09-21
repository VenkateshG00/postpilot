export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'

export default async function AdminAccounts() {
  const { service } = await requireAdminServer()

  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    service.from('social_accounts')
      .select('id, user_id, platform, account_name, is_active, token_expires_at, connected_at')
      .order('connected_at', { ascending: false }),
    service.from('profiles').select('id, email'),
  ])

  const emailByUser: Record<string, string> = {}
  ;(profiles ?? []).forEach((p: any) => { emailByUser[p.id] = p.email })

  const now = Date.now()
  const soon = 7 * 24 * 60 * 60 * 1000

  function expiryBadge(exp: string | null) {
    if (!exp) return <span className="text-xs text-gray-400">—</span>
    const t = new Date(exp).getTime()
    if (t < now) return <span className="text-xs font-medium text-red-600">Expired</span>
    if (t - now < soon) return <span className="text-xs font-medium text-amber-600">Expiring soon</span>
    return <span className="text-xs text-gray-600">{new Date(exp).toLocaleDateString('en-IN')}</span>
  }

  const rows = accounts ?? []

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">Every connected channel across all users ({rows.length})</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left font-medium px-4 py-3">Account</th>
              <th className="text-left font-medium px-4 py-3">Platform</th>
              <th className="text-left font-medium px-4 py-3">Owner</th>
              <th className="text-left font-medium px-4 py-3">Active</th>
              <th className="text-left font-medium px-4 py-3">Token expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-900">{a.account_name ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{a.platform}</td>
                <td className="px-4 py-3 text-gray-600">{emailByUser[a.user_id] ?? '—'}</td>
                <td className="px-4 py-3">{a.is_active ? <span className="text-emerald-600 text-xs font-medium">Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                <td className="px-4 py-3">{expiryBadge(a.token_expires_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No connected accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
