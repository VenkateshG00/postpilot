'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Lock, Loader2, CheckCircle2 } from 'lucide-react'

interface Brand { name: string; logo_url: string; color: string }

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{hint}</p>}
    </div>
  )
}

export default function WhiteLabelClient({
  eligible,
  planName,
  brand: initial,
}: {
  eligible: boolean
  planName: string
  brand: Brand
}) {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof Brand>(k: K, v: string) {
    setBrand(p => ({ ...p, [k]: v }))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/white-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_name: brand.name, brand_logo_url: brand.logo_url, brand_color: brand.color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
      setTimeout(() => router.refresh(), 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ── Upgrade wall ── */
  if (!eligible) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>White-label</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Put your own brand on the dashboard</p>
        </div>
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <Lock size={20} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            White-label is an Agency feature
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            You're on the <strong>{planName}</strong> plan. Upgrade to Agency to replace PostPilot
            branding with your own logo, name, and colours.
          </p>
          <a
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            See plans
          </a>
        </div>
      </div>
    )
  }

  /* ── Settings form ── */
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>White-label</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Replace PostPilot branding with your own across the dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#22c55e' }}>
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          {error && <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-2xl p-6 space-y-5 mb-6" style={cardStyle}>
        <Field label="Brand name" hint="Shown in the sidebar if no logo is set.">
          <input
            style={inputStyle}
            value={brand.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Your agency name"
          />
        </Field>

        <Field label="Logo URL" hint="A hosted image URL (PNG/SVG). Replaces the name when set.">
          <input
            style={inputStyle}
            value={brand.logo_url}
            onChange={e => set('logo_url', e.target.value)}
            placeholder="https://…/logo.png"
          />
        </Field>

        <Field label="Brand colour">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brand.color || '#3355ff'}
              onChange={e => set('color', e.target.value)}
              className="h-11 w-14 rounded-xl cursor-pointer"
              style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: 2 }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={brand.color}
              onChange={e => set('color', e.target.value)}
              placeholder="#3355ff"
            />
          </div>
        </Field>
      </div>

      {/* Preview */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>Preview</p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="h-7 max-w-[150px] object-contain" />
          ) : (
            <>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: brand.color || '#3355ff' }}
              >
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {brand.name || 'Your Brand'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
