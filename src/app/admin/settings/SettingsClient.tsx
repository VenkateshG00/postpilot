'use client'

import { useState } from 'react'

const AI_PROVIDERS: {
  value: string
  label: string
  quality: number
  suggestedCredits: number
  desc: string
  envHint: string
  note?: string
}[] = [
  {
    value: 'replicate_flux',
    label: 'Flux Schnell (Replicate)',
    quality: 4,
    suggestedCredits: 4,
    desc: 'Best quality, fastest. Needs a Replicate account with billing.',
    envHint: 'REPLICATE_API_TOKEN',
  },
  {
    value: 'gemini_flash',
    label: 'Gemini Flash (Google)',
    quality: 3,
    suggestedCredits: 2,
    desc: 'Google Gemini image generation. Free tier: 1,500 images/day.',
    envHint: 'GEMINI_API_KEY',
  },
  {
    value: 'huggingface_flux',
    label: 'Flux Schnell (Hugging Face)',
    quality: 3,
    suggestedCredits: 3,
    desc: 'Same model via HuggingFace free inference tier. Occasional cold starts.',
    envHint: 'HUGGINGFACE_TOKEN',
  },
  {
    value: 'cloudflare_sdxl',
    label: 'SDXL Lightning (Cloudflare)',
    quality: 2,
    suggestedCredits: 2,
    desc: 'Included in Cloudflare Workers AI free allowance. SDXL-based, slightly less detailed.',
    envHint: 'CF_ACCOUNT_ID + CF_AI_TOKEN',
  },
  {
    value: 'pollinations',
    label: 'Pollinations.ai',
    quality: 1,
    suggestedCredits: 1,
    desc: 'Completely free, no API key needed. Lower consistency; great for testing.',
    envHint: 'none required',
    note: 'Public service — image quality may vary.',
  },
]

interface Settings {
  default_trial_days: number
  default_image_provider: string
  ai_active_provider: string
  ai_provider_credits: Record<string, number>
  cron_frequency: string
  maintenance_mode: boolean
  announcement_banner: string | null
}
interface Pack { name: string; credits: number; price_inr: number; is_active: boolean }

export default function AdminSettingsClient({ settings: initial, packs: initialPacks }: { settings: Settings; packs: Pack[] }) {
  const [s, setS] = useState<Settings>({
    default_trial_days: initial.default_trial_days ?? 7,
    default_image_provider: initial.default_image_provider ?? 'pexels',
    ai_active_provider: initial.ai_active_provider ?? 'none',
    ai_provider_credits: initial.ai_provider_credits ?? {
      replicate_flux: 4, gemini_flash: 2, huggingface_flux: 3, cloudflare_sdxl: 2, pollinations: 1,
    },
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

      {/* AI Image Generation */}
      <div className="card p-6 space-y-5 mb-6">
        <div>
          <h2 className="font-medium text-gray-900">AI image generation</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Select the active provider and set how many credits each generation costs.
            Clients only see the button when a provider is active. Switch any time — no redeploy needed.
          </p>
        </div>

        {/* Disabled option */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <input type="radio" name="ai_active_provider" value="none"
            checked={s.ai_active_provider === 'none'}
            onChange={() => setField('ai_active_provider', 'none')}
            className="accent-brand-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Disabled</p>
            <p className="text-xs text-gray-400">AI image button hidden from all users</p>
          </div>
        </label>

        {/* Provider cards */}
        {AI_PROVIDERS.map(p => {
          const active = s.ai_active_provider === p.value
          return (
            <label key={p.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                active ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <input type="radio" name="ai_active_provider" value={p.value}
                checked={active}
                onChange={() => setField('ai_active_provider', p.value)}
                className="mt-1 accent-brand-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{p.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{p.envHint}</span>
                  <span className="text-yellow-500 text-xs">{'★'.repeat(p.quality) + '☆'.repeat(4 - p.quality)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                {p.note && <p className="text-xs text-amber-600 mt-0.5">⚠ {p.note}</p>}
              </div>
              {/* Credit cost editor */}
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.preventDefault()}>
                <span className="text-xs text-gray-500">Credits:</span>
                <input
                  type="number" min={1} max={20}
                  value={s.ai_provider_credits[p.value] ?? p.suggestedCredits}
                  onChange={e => setField('ai_provider_credits', {
                    ...s.ai_provider_credits,
                    [p.value]: Math.max(1, Number(e.target.value)),
                  })}
                  className="w-14 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </label>
          )
        })}
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
