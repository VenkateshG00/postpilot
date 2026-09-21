'use client'

import { useState } from 'react'

interface Settings {
  default_trial_days: number
  default_image_provider: string
  cron_frequency: string
  maintenance_mode: boolean
  announcement_banner: string | null
}
interface Pack { name: string; credits: number; price_inr: number; is_active: boolean }

export default function AdminSettingsClient({ settings: initial, packs: initialPacks }: { settings: Settings; packs: Pack[] }) {
  const [s, setS] = useState<Settings>({
    default_trial_days: initial.default_trial_days ?? 7,
    default_image_provider: initial.default_image_provider ?? 'pexels',
    cron_frequency: initial.cron_frequency ?? '',
    maintenance_mode: initial.maintenance_mode ?? false,
    announcement_banner: initial.announcement_banner ?? '',
  })
  const [packs, setPacks] = useState<Pack[]>(initialPacks)
  const [status, setStatus] = useState('')

  function setField<K extends keyof Settings>(k: K, v: Settings[K]) { setS(p => ({ ...p, [k]: v })) }
  function setPack(i: number, k: keyof Pack, v: any) { setPacks(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p)) }

  async function save() {
    setStatus('Saving…')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, credit_packs: packs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus('Saved ✓')
      setTimeout(() => setStatus(''), 2500)
    } catch (e: any) { setStatus(e.message) }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Global platform settings</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-gray-500">{status}</span>}
          <button onClick={save} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Save</button>
        </div>
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <h2 className="font-medium text-gray-900">Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Default trial days</label>
            <input type="number" className="input-base" value={s.default_trial_days}
              onChange={e => setField('default_trial_days', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Default image provider</label>
            <select className="input-base" value={s.default_image_provider}
              onChange={e => setField('default_image_provider', e.target.value)}>
              <option value="pexels">pexels</option>
              <option value="dalle">dalle</option>
            </select>
          </div>
          <div>
            <label className="label">Cron frequency</label>
            <input className="input-base" value={s.cron_frequency}
              onChange={e => setField('cron_frequency', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Announcement banner (shows to all users; blank = off)</label>
          <input className="input-base" value={s.announcement_banner ?? ''}
            onChange={e => setField('announcement_banner', e.target.value)} placeholder="e.g. Scheduled maintenance Sunday 2am" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={s.maintenance_mode} onChange={e => setField('maintenance_mode', e.target.checked)} />
          Maintenance mode
        </label>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-medium text-gray-900">Credit packs</h2>
        {packs.map((p, i) => (
          <div key={p.name} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="label">Pack</label>
              <p className="text-sm text-gray-900 py-2">{p.name}</p>
            </div>
            <div>
              <label className="label">Credits</label>
              <input type="number" className="input-base" value={p.credits} onChange={e => setPack(i, 'credits', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Price ₹</label>
              <input type="number" className="input-base" value={p.price_inr} onChange={e => setPack(i, 'price_inr', Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
              <input type="checkbox" checked={p.is_active} onChange={e => setPack(i, 'is_active', e.target.checked)} /> Active
            </label>
          </div>
        ))}
        {packs.length === 0 && <p className="text-sm text-gray-400">No credit packs.</p>}
      </div>
    </div>
  )
}
