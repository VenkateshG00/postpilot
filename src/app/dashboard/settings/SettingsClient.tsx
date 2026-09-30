'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES, BRAND_VOICES, TIMEZONES, LANGUAGES } from '@/lib/utils'
import type { Profile, BusinessProfile } from '@/types'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}{hint && <span className="font-normal ml-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, appearance: 'none' }} className="w-full" />
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: 'none' }} />
}

export default function SettingsClient({ profile, biz }: { profile: Profile | null; biz: BusinessProfile | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gen, setGen] = useState(false)
  const [form, setForm] = useState({
    business_name:   biz?.business_name   || '',
    industry:        biz?.industry        || '',
    description:     biz?.description     || '',
    target_audience: biz?.target_audience || '',
    brand_voice:     biz?.brand_voice     || 'professional',
    language:        biz?.language        || 'en',
    timezone:        biz?.timezone        || 'UTC',
    topics:          biz?.topics?.join(', ')  || '',
    hashtags:        biz?.hashtags?.join(', ') || '',
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function suggestTopics() {
    setGen(true)
    try {
      const res = await fetch('/api/pillars/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.business_name, industry: form.industry,
          description: form.description, target_audience: form.target_audience,
          brand_voice: form.brand_voice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (Array.isArray(data.topics) && data.topics.length) setForm(f => ({ ...f, topics: data.topics.join(', ') }))
    } catch (e: any) { alert(e.message) } finally { setGen(false) }
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('business_profiles').upsert({
      user_id: user!.id,
      business_name: form.business_name,
      industry: form.industry,
      description: form.description,
      target_audience: form.target_audience,
      brand_voice: form.brand_voice as any,
      language: form.language,
      timezone: form.timezone,
      topics:   form.topics.split(',').map(t => t.trim()).filter(Boolean),
      hashtags: form.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Update your business profile and content preferences
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Business profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business name">
            <Input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="My Business" />
          </Field>
          <Field label="Industry">
            <Select value={form.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="What does your business do?">
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            placeholder="We sell handmade pastries and coffee in downtown Austin…"
          />
        </Field>

        <Field label="Target audience">
          <Input
            value={form.target_audience}
            onChange={e => set('target_audience', e.target.value)}
            placeholder="Local food lovers aged 25–45"
          />
        </Field>

        {/* Brand voice */}
        <Field label="Brand voice">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            {BRAND_VOICES.map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => set('brand_voice', v.value)}
                className="text-left p-3.5 rounded-xl transition-all"
                style={{
                  border: `2px solid ${form.brand_voice === v.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.brand_voice === v.value ? 'var(--accent-subtle)' : 'var(--bg)',
                }}
              >
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{v.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.desc}</div>
              </button>
            ))}
          </div>
        </Field>

        {/* Topics */}
        <Field label="Content topics" hint="(comma-separated)">
          <div className="flex items-center gap-2 mb-1.5 justify-between">
            <span />
            <button
              type="button"
              onClick={suggestTopics}
              disabled={gen}
              className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity disabled:opacity-40"
              style={{ color: 'var(--accent)' }}
            >
              <Sparkles size={11} /> {gen ? 'Generating…' : 'Suggest with AI'}
            </button>
          </div>
          <Input
            value={form.topics}
            onChange={e => set('topics', e.target.value)}
            placeholder="Daily specials, Behind the scenes, Customer stories"
          />
        </Field>

        <Field label="Default hashtags" hint="(comma-separated, no #)">
          <Input
            value={form.hashtags}
            onChange={e => set('hashtags', e.target.value)}
            placeholder="localfood, bakery, freshbread"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Language">
            <Select value={form.language} onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Timezone">
            <Select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>

        {/* Save row */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: '#22c55e' }}>
                <CheckCircle2 size={14} /> Saved successfully
              </span>
            )}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
