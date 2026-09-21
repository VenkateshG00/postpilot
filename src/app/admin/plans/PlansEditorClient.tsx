'use client'

import { useState } from 'react'

interface PlanRow {
  key: string
  name: string
  price_inr: number
  channels_included: number
  posts_per_day: number | null
  credits_per_month: number
  seats_included: number
  allow_dalle: boolean
  white_label: boolean
  trial_days: number
  analytics_level: string
  extra_channel_price: number
  extra_seat_price: number
  is_active: boolean
  sort_order: number
  _isNew?: boolean
}

const BLANK: PlanRow = {
  key: '', name: '', price_inr: 0, channels_included: 1, posts_per_day: null,
  credits_per_month: 0, seats_included: 1, allow_dalle: false, white_label: false,
  trial_days: 0, analytics_level: 'basic', extra_channel_price: 0, extra_seat_price: 0,
  is_active: true, sort_order: 0, _isNew: true,
}

export default function PlansEditorClient({ initialPlans }: { initialPlans: PlanRow[] }) {
  const [plans, setPlans] = useState<PlanRow[]>(initialPlans)
  const [status, setStatus] = useState<Record<number, string>>({})

  function update(i: number, field: keyof PlanRow, value: any) {
    setPlans(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  async function save(i: number) {
    setStatus(s => ({ ...s, [i]: 'Saving…' }))
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plans[i]),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPlans(prev => prev.map((p, idx) => (idx === i ? { ...p, _isNew: false } : p)))
      setStatus(s => ({ ...s, [i]: 'Saved ✓' }))
      setTimeout(() => setStatus(s => ({ ...s, [i]: '' })), 2500)
    } catch (e: any) {
      setStatus(s => ({ ...s, [i]: e.message }))
    }
  }

  function addPlan() {
    setPlans(prev => [...prev, { ...BLANK, sort_order: prev.length + 1 }])
  }

  const numField = (i: number, field: keyof PlanRow, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input-base"
        value={(plans[i][field] as number) ?? 0}
        onChange={e => update(i, field, e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Plans</h1>
        <p className="text-sm text-gray-500 mt-1">
          Edit subscription plans. Changes save to the database and go live immediately — no code deploy.
        </p>
      </div>

      <div className="space-y-6">
        {plans.map((p, i) => (
          <div key={i} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p._isNew ? (
                  <input
                    className="input-base w-44"
                    placeholder="plan key (e.g. premium)"
                    value={p.key}
                    onChange={e => update(i, 'key', e.target.value)}
                  />
                ) : (
                  <span className="font-semibold text-gray-900">{p.key}</span>
                )}
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={p.is_active} onChange={e => update(i, 'is_active', e.target.checked)} />
                  Active
                </label>
              </div>
              <div className="flex items-center gap-3">
                {status[i] && <span className="text-sm text-gray-500">{status[i]}</span>}
                <button
                  onClick={() => save(i)}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Name</label>
                <input className="input-base" value={p.name} onChange={e => update(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="label">Price (₹/mo)</label>
                <input
                  type="number"
                  className="input-base"
                  value={p.price_inr}
                  onChange={e => update(i, 'price_inr', e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">
                  Posts/day <span className="text-gray-400">(blank = unlimited)</span>
                </label>
                <input
                  type="number"
                  className="input-base"
                  placeholder="unlimited"
                  value={p.posts_per_day ?? ''}
                  onChange={e => update(i, 'posts_per_day', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              {numField(i, 'channels_included', 'Channels')}
              {numField(i, 'credits_per_month', 'AI credits/mo')}
              {numField(i, 'seats_included', 'Team seats')}
              {numField(i, 'trial_days', 'Trial days')}
              {numField(i, 'sort_order', 'Sort order')}
              {numField(i, 'extra_channel_price', 'Extra channel ₹')}
              {numField(i, 'extra_seat_price', 'Extra seat ₹')}
              <div>
                <label className="label">Analytics</label>
                <select
                  className="input-base"
                  value={p.analytics_level}
                  onChange={e => update(i, 'analytics_level', e.target.value)}
                >
                  <option value="basic">basic</option>
                  <option value="full">full</option>
                  <option value="full_plus">full_plus</option>
                </select>
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={p.allow_dalle} onChange={e => update(i, 'allow_dalle', e.target.checked)} />
                  DALL-E
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={p.white_label} onChange={e => update(i, 'white_label', e.target.checked)} />
                  White-label
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addPlan}
        className="mt-6 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Add plan
      </button>
    </div>
  )
}
