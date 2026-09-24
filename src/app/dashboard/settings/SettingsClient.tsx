'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES, BRAND_VOICES, TIMEZONES, LANGUAGES, cn } from '@/lib/utils'
import type { Profile, BusinessProfile } from '@/types'

export default function SettingsClient({ profile, biz }: { profile: Profile | null, biz: BusinessProfile | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [form, setForm]     = useState({
    business_name:   biz?.business_name   || '',
    industry:        biz?.industry        || '',
    description:     biz?.description     || '',
    target_audience: biz?.target_audience || '',
    brand_voice:     biz?.brand_voice     || 'professional',
    language:        biz?.language        || 'en',
    timezone:        biz?.timezone        || 'UTC',
    topics:          biz?.topics?.join(', ')  || '',
    hashtags:        biz?.hashtags?.join(', ') || ''
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const [gen, setGen] = useState(false)
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
      user_id:         user!.id,
      business_name:   form.business_name,
      industry:        form.industry,
      description:     form.description,
      target_audience: form.target_audience,
      brand_voice:     form.brand_voice as any,
      language:        form.language,
      timezone:        form.timezone,
      topics:   form.topics.split(',').map(t => t.trim()).filter(Boolean),
      hashtags: form.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean)
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Update your business profile and content preferences</p>
      </div>

      <div className="card p-7 space-y-5">
        <h2 className="font-medium text-gray-900">Business profile</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business name</label>
            <input value={form.business_name} onChange={e => set('business_name', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label">Industry</label>
            <select value={form.industry} onChange={e => set('industry', e.target.value)} className="input-base">
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">What does your business do?</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            className="input-base resize-none"
          />
        </div>

        <div>
          <label className="label">Target audience</label>
          <input value={form.target_audience} onChange={e => set('target_audience', e.target.value)} className="input-base" />
        </div>

        <div>
          <label className="label">Brand voice</label>
          <div className="grid grid-cols-2 gap-3">
            {BRAND_VOICES.map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => set('brand_voice', v.value)}
                className={cn(
                  'text-left p-3.5 rounded-xl border-2 transition-all',
                  form.brand_voice === v.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="font-medium text-sm text-gray-900">{v.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Content topics <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <button type="button" onClick={suggestTopics} disabled={gen}
              className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
              {gen ? 'Generating…' : '✨ Suggest with AI'}
            </button>
          </div>
          <input
            value={form.topics}
            onChange={e => set('topics', e.target.value)}
            placeholder="Daily specials, Behind the scenes, Customer stories"
            className="input-base"
          />
        </div>

        <div>
          <label className="label">Default hashtags <span className="text-gray-400 font-normal">(comma-separated, no #)</span></label>
          <input
            value={form.hashtags}
            onChange={e => set('hashtags', e.target.value)}
            placeholder="austinfood, bakery, freshbread"
            className="input-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <select value={form.language} onChange={e => set('language', e.target.value)} className="input-base">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Timezone</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className="input-base">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
          </div>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
