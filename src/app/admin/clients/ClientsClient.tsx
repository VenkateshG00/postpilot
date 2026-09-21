'use client'

import { useState } from 'react'

interface Client {
  id: string
  email: string
  business_name: string
  plan: string
  plan_expires_at: string | null
  credits_balance: number
  is_suspended: boolean
  created_at: string
  published: number
}

export default function ClientsClient({ clients: initial, planKeys }: { clients: Client[]; planKeys: string[] }) {
  const [clients, setClients] = useState<Client[]>(initial)
  const [filter, setFilter] = useState<string>('all')
  const [busy, setBusy] = useState<string>('')

  async function act(userId: string, action: string, payload: Record<string, any>) {
    setBusy(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setClients(prev => prev.map(c => (c.id === userId ? { ...c, ...payload } : c)))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy('')
    }
  }

  function statusOf(c: Client) {
    if (c.is_suspended) return <span className="text-xs font-medium text-red-600">Suspended</span>
    const exp = c.plan_expires_at ? new Date(c.plan_expires_at).getTime() : null
    if (c.plan !== 'free' && exp && exp < Date.now()) return <span className="text-xs font-medium text-amber-600">Expired</span>
    if (c.plan !== 'free') return <span className="text-xs font-medium text-emerald-600">Active</span>
    return <span className="text-xs text-gray-500">Free</span>
  }

  const tabs = ['all', ...planKeys]
  const shown = filter === 'all' ? clients : clients.filter(c => c.plan === filter)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Subscribers by plan ({clients.length})</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => {
          const n = t === 'all' ? clients.length : clients.filter(c => c.plan === t).length
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={'px-3 py-1.5 rounded-lg text-sm capitalize ' + (filter === t ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
              {t} <span className="opacity-70">({n})</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {shown.map(c => (
          <div key={c.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.business_name}</p>
                <p className="text-xs text-gray-500 truncate">{c.email} · joined {new Date(c.created_at).toLocaleDateString('en-IN')} · {c.published} posts</p>
              </div>
              <div className="flex items-center gap-2">{statusOf(c)}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 items-end">
              <div>
                <label className="label">Plan</label>
                <select className="input-base" value={c.plan} disabled={busy === c.id}
                  onChange={e => act(c.id, 'set_plan', { plan: e.target.value })}>
                  {planKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Credits</label>
                <div className="flex gap-1">
                  <input type="number" className="input-base" defaultValue={c.credits_balance}
                    onBlur={e => { const v = Number(e.target.value); if (v !== c.credits_balance) act(c.id, 'set_credits', { credits_balance: v }) }} />
                </div>
              </div>
              <div>
                <label className="label">Access until</label>
                <p className="text-sm text-gray-700 py-2">{c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString('en-IN') : '—'}</p>
              </div>
              <div className="flex gap-2">
                <button disabled={busy === c.id} onClick={() => act(c.id, 'set_expiry', { plan_expires_at: new Date(Date.now() + 30 * 864e5).toISOString() })}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50">+30 days</button>
                <button disabled={busy === c.id} onClick={() => act(c.id, 'suspend', { is_suspended: !c.is_suspended })}
                  className={'px-3 py-2 rounded-lg text-xs font-medium ' + (c.is_suspended ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700')}>
                  {c.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No clients on this plan.</p>}
      </div>
    </div>
  )
}
