'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Lock } from 'lucide-react'

interface Brand { name: string; logo_url: string; color: string }

export default function WhiteLabelClient({ eligible, planName, brand: initial }: { eligible: boolean; planName: string; brand: Brand }) {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand>(initial)
  const [status, setStatus] = useState('')

  function set<K extends keyof Brand>(k: K, v: string) { setBrand(p => ({ ...p, [k]: v })) }

  async function save() {
    setStatus('Saving…')
    try {
      const res = await fetch('/api/white-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus('Saved ✓')
      setTimeout(() => router.refresh(), 1200)
    } catch (e: any) { setStatus(e.message) }
  }

  if (!eligible) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">White-label</h1>
          <p className="text-sm text-gray-500 mt-1">Put your own brand on the dashboard</p>
        </div>
        <div className="card p-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="text-gray-400" size={20} />
          </div>
          <p className="font-medium text-gray-900">White-label is an Agency feature</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">You're on the {planName} plan. Upgrade to Agency to replace PostPilot branding with your own logo, name, and colors.</p>
          <a href="/dashboard/billing" className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">See plans</a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">White-label</h1>
          <p className="text-sm text-gray-500 mt-1">Replace PostPilot branding with your own across your dashboard.</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-gray-500">{status}</span>}
          <button onClick={save} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Save</button>
        </div>
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <div>
          <label className="label">Brand name</label>
          <input className="input-base" value={brand.name} onChange={e => set('name', e.target.value)} placeholder="Your agency name" />
          <p className="text-xs text-gray-400 mt-1">Shown in the sidebar if no logo is set.</p>
        </div>
        <div>
          <label className="label">Logo URL</label>
          <input className="input-base" value={brand.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…/logo.png" />
          <p className="text-xs text-gray-400 mt-1">A hosted image URL (PNG/SVG). Replaces the name when set.</p>
        </div>
        <div>
          <label className="label">Brand color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={brand.color || '#3355ff'} onChange={e => set('color', e.target.value)} className="h-10 w-14 rounded border border-gray-200" />
            <input className="input-base flex-1" value={brand.color} onChange={e => set('color', e.target.value)} placeholder="#3355ff" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-xs font-medium text-gray-500 mb-3">Preview</p>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="h-7 max-w-[150px] object-contain" />
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.color || '#3355ff' }}>
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900">{brand.name || 'Your Brand'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
