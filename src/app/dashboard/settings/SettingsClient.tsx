'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle2, Sparkles, Settings, Clock, Bell,
  AlertTriangle, Trash2, Download, User, Building2, Globe,
  MessageSquare, Mail, Smartphone, Palette, Bot, ImagePlus, Shield, Unplug, RefreshCw, Send
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES, BRAND_VOICES, TIMEZONES, LANGUAGES } from '@/lib/utils'
import type { Profile, BusinessProfile, Schedule } from '@/types'

/* ── Shared field helpers ─────────────────────────── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
        {hint && <span className="font-normal ml-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{hint}</span>}
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
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, appearance: 'none', ...props.style }} className="w-full" />
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: 'none', ...props.style }} />
}

/* ── Tab config ───────────────────────────────────── */
const TABS = [
  { id: 'general',       label: 'General',       icon: Settings },
  { id: 'scheduling',    label: 'Scheduling',    icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'brandkit',      label: 'Brand Kit',     icon: Palette },
  { id: 'ai_assistants', label: 'AI Assistants', icon: Bot },
  { id: 'hookphoto',     label: 'Hook Photo',    icon: ImagePlus },
  { id: 'danger',        label: 'Danger Zone',   icon: AlertTriangle },
] as const
type TabId = (typeof TABS)[number]['id']

/* ── Component ────────────────────────────────────── */
export default function SettingsClient({
  profile,
  biz,
  schedules,
}: {
  profile: Profile | null
  biz: BusinessProfile | null
  schedules: Schedule[] | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gen, setGen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  /* General form */
  const [form, setForm] = useState({
    full_name:       profile?.full_name || '',
    business_name:   biz?.business_name || '',
    industry:        biz?.industry || '',
    description:     biz?.description || '',
    target_audience: biz?.target_audience || '',
    brand_voice:     biz?.brand_voice || 'professional',
    language:        biz?.language || 'en',
    timezone:        biz?.timezone || 'Asia/Kolkata',
    topics:          biz?.topics?.join(', ') || '',
    hashtags:        biz?.hashtags?.join(', ') || '',
  })

  /* Notification prefs (persisted to business_profiles.notification_prefs JSON) */
  const [notifs, setNotifs] = useState({
    email_published: (biz as any)?.notification_prefs?.email_published ?? true,
    email_failed:    (biz as any)?.notification_prefs?.email_failed ?? true,
    email_weekly:    (biz as any)?.notification_prefs?.email_weekly ?? false,
    email_comments:  (biz as any)?.notification_prefs?.email_comments ?? false,
    email_mentions:  (biz as any)?.notification_prefs?.email_mentions ?? true,
    email_team:      (biz as any)?.notification_prefs?.email_team ?? true,
    push_published:  (biz as any)?.notification_prefs?.push_published ?? false,
    push_failed:     (biz as any)?.notification_prefs?.push_failed ?? true,
    push_comments:   (biz as any)?.notification_prefs?.push_comments ?? false,
    push_mentions:   (biz as any)?.notification_prefs?.push_mentions ?? true,
    in_app_all:      (biz as any)?.notification_prefs?.in_app_all ?? true,
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  async function saveNotificationPrefs() {
    setNotifSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('business_profiles').update({ notification_prefs: notifs }).eq('user_id', user!.id)
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2500)
    } catch (e: any) {
      alert('Failed to save notification preferences: ' + e.message)
    } finally {
      setNotifSaving(false)
    }
  }


  /* Brand Kit */
  const [brandKit, setBrandKit] = useState({
    primary_color:   '#6366f1',
    secondary_color: '#8b5cf6',
    accent_color:    '#ec4899',
    heading_font:    'Inter',
    body_font:       'Inter',
    logo_url:        '',
  })
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandSaved, setBrandSaved] = useState(false)

  async function saveBrandKit() {
    setBrandSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('brand_kits').upsert(
        { user_id: user!.id, ...brandKit },
        { onConflict: 'user_id' }
      )
      setBrandSaved(true)
      setTimeout(() => setBrandSaved(false), 2500)
    } catch (e: any) {
      alert('Failed to save brand kit: ' + e.message)
    } finally {
      setBrandSaving(false)
    }
  }


  /* AI Assistants config */
  const [aiConfig, setAiConfig] = useState({
    tone_preset:        (biz as any)?.ai_config?.tone_preset || 'professional',
    custom_instructions: (biz as any)?.ai_config?.custom_instructions || '',
    response_length:    (biz as any)?.ai_config?.response_length || 'medium',
  })
  const [aiSaving, setAiSaving] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  async function saveAiConfig() {
    setAiSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('business_profiles').update({ ai_config: aiConfig }).eq('user_id', user!.id)
      setAiSaved(true)
      setTimeout(() => setAiSaved(false), 2500)
    } catch (e: any) {
      alert('Failed to save AI config: ' + e.message)
    } finally {
      setAiSaving(false)
    }
  }

  /* Hook Photo */
  const [hookPhotoUrl, setHookPhotoUrl] = useState((biz as any)?.hook_photo_url || '')
  const [hookSaving, setHookSaving] = useState(false)
  const [hookSaved, setHookSaved] = useState(false)

  async function saveHookPhoto() {
    setHookSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('business_profiles').update({ hook_photo_url: hookPhotoUrl }).eq('user_id', user!.id)
      setHookSaved(true)
      setTimeout(() => setHookSaved(false), 2500)
    } catch (e: any) {
      alert('Failed to save hook photo: ' + e.message)
    } finally {
      setHookSaving(false)
    }
  }

  function setBK(key: string, val: string) {
    setBrandKit(b => ({ ...b, [key]: val }))
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  /* AI topic suggestions */
  async function suggestTopics() {
    setGen(true)
    try {
      const res = await fetch('/api/pillars/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.business_name,
          industry: form.industry,
          description: form.description,
          target_audience: form.target_audience,
          brand_voice: form.brand_voice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (Array.isArray(data.topics) && data.topics.length)
        setForm(f => ({ ...f, topics: data.topics.join(', ') }))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGen(false)
    }
  }

  /* Save general + scheduling */
  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Update profile name
    if (form.full_name !== (profile?.full_name || '')) {
      await supabase.from('profiles').update({ full_name: form.full_name }).eq('id', user!.id)
    }

    // Upsert business profile
    await supabase.from('business_profiles').upsert(
      {
        user_id: user!.id,
        business_name: form.business_name,
        industry: form.industry,
        description: form.description,
        target_audience: form.target_audience,
        brand_voice: form.brand_voice as any,
        language: form.language,
        timezone: form.timezone,
        topics: form.topics.split(',').map(t => t.trim()).filter(Boolean),
        hashtags: form.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
      },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  /* Delete account */
  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to delete account')
      window.location.href = '/'
    } catch (e: any) {
      alert(e.message)
      setDeleting(false)
    }
  }

  /* Export data */
  async function handleExport() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: posts }, { data: scheds }, { data: bizData }] = await Promise.all([
        supabase.from('post_logs').select('*').eq('user_id', user!.id),
        supabase.from('schedules').select('*').eq('user_id', user!.id),
        supabase.from('business_profiles').select('*').eq('user_id', user!.id),
      ])
      const blob = new Blob(
        [JSON.stringify({ posts, schedules: scheds, business_profile: bizData }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `postpilot-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Export failed: ' + e.message)
    }
  }

  return (
    <div className="">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-heading"><em>Settings</em>.</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your account, scheduling preferences, and notifications
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {TABS.map(t => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn-secondary flex items-center gap-2 text-sm transition-all flex-1 justify-center"
              style={{
                background: active ? (t.id === 'danger' ? 'rgba(239,68,68,0.08)' : 'var(--accent-subtle)') : 'transparent',
                color: active
                  ? (t.id === 'danger' ? '#ef4444' : 'var(--accent)')
                  : 'var(--text-muted)',
              }}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* GENERAL TAB                                    */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'general' && (
        <div className="space-y-6">
          {/* Account info card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <User size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Account</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <Input
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={profile?.email || ''}
                  disabled
                  style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                />
              </Field>
            </div>
          </div>

          {/* Business profile card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Building2 size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Business Profile</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Business name">
                  <Input
                    value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                    placeholder="My Business"
                  />
                </Field>
                <Field label="Industry">
                  <Select value={form.industry} onChange={e => set('industry', e.target.value)}>
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
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
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {v.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {v.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Topics */}
              <Field label="Content topics" hint="(comma-separated)">
                <div className="flex items-center gap-2 mb-1.5 justify-end">
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
            </div>
          </div>

          {/* Language & Timezone card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Globe size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Language &amp; Region
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Language">
                <Select value={form.language} onChange={e => set('language', e.target.value)}>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Timezone">
                <Select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  {TIMEZONES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between">
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
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* SCHEDULING TAB                                 */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'scheduling' && (
        <div className="space-y-6">
          {/* Active schedules summary */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Clock size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Active Schedules
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {schedules?.length ?? 0} schedule{(schedules?.length ?? 0) !== 1 ? 's' : ''} running
                </p>
              </div>
            </div>

            {schedules && schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {s.name || 'Untitled schedule'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {s.frequency} · {s.post_times?.join(', ') || 'No times set'} ·{' '}
                        <span className="capitalize">{s.content_type}</span>
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-1 rounded-full font-semibold"
                      style={{
                        background: s.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(161,161,170,0.1)',
                        color: s.is_active ? '#16a34a' : 'var(--text-muted)',
                      }}
                    >
                      {s.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-center py-8 rounded-xl"
                style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
              >
                <Clock size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No schedules yet
                </p>
                <a
                  href="/dashboard/schedule"
                  className="text-xs font-semibold mt-1 inline-block hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Create your first schedule →
                </a>
              </div>
            )}
          </div>

          {/* Default posting preferences */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <MessageSquare size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Default Posting Preferences
              </h2>
            </div>

            <div className="space-y-4">
              <Field label="Default timezone for new schedules">
                <Select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  {TIMEZONES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Default content type">
                <div className="flex gap-2 mt-1">
                  {(['post', 'reel', 'carousel'] as const).map(ct => (
                    <button
                      key={ct}
                      type="button"
                      className="px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              </Field>

              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Require approval before publishing
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Review AI-generated posts before they go live
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div
                    className="w-[44px] h-[24px] rounded-full peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ background: 'var(--accent)' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* NOTIFICATIONS TAB                              */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          {/* Email notifications */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Mail size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Email Notifications
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Choose which emails you want to receive
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { key: 'email_published', title: 'Post published',     desc: 'Get notified when a post is published successfully' },
                { key: 'email_failed',    title: 'Post failed',        desc: 'Get notified when a post fails to publish' },
                { key: 'email_weekly',    title: 'Weekly digest',      desc: 'Receive a weekly summary of your posting activity and engagement' },
                { key: 'email_comments',  title: 'New comments',       desc: 'Get notified when someone comments on your posts' },
                { key: 'email_mentions',  title: 'Mentions & tags',    desc: 'Get notified when someone mentions or tags your account' },
                { key: 'email_team',      title: 'Team activity',      desc: 'Get notified about team invites, role changes, and member activity' },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifs[item.key as keyof typeof notifs]}
                      onChange={e =>
                        setNotifs(n => ({ ...n, [item.key]: e.target.checked }))
                      }
                    />
                    <div
                      className="w-[44px] h-[24px] rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"
                      style={{
                        background: notifs[item.key as keyof typeof notifs]
                          ? 'var(--accent)'
                          : 'var(--border)',
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Push notifications */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Smartphone size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Push Notifications
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Browser push notifications for real-time updates
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { key: 'push_published', title: 'Post published',  desc: 'Browser push when a post goes live' },
                { key: 'push_failed',    title: 'Post failed',     desc: 'Browser push when a post fails' },
                { key: 'push_comments',  title: 'New comments',    desc: 'Browser push when someone comments on your post' },
                { key: 'push_mentions',  title: 'Mentions & tags', desc: 'Browser push when you are mentioned or tagged' },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifs[item.key as keyof typeof notifs]}
                      onChange={e =>
                        setNotifs(n => ({ ...n, [item.key]: e.target.checked }))
                      }
                    />
                    <div
                      className="w-[44px] h-[24px] rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"
                      style={{
                        background: notifs[item.key as keyof typeof notifs]
                          ? 'var(--accent)'
                          : 'var(--border)',
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* In-app notifications */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Bell size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  In-App Notifications
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Notifications shown inside your PostPilot dashboard
                </p>
              </div>
            </div>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Show all in-app notifications
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Display a notification bell with activity feed in the dashboard
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifs.in_app_all}
                  onChange={e =>
                    setNotifs(n => ({ ...n, in_app_all: e.target.checked }))
                  }
                />
                <div
                  className="w-[44px] h-[24px] rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"
                  style={{
                    background: notifs.in_app_all
                      ? 'var(--accent)'
                      : 'var(--border)',
                  }}
                />
              </label>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <div>
              {notifSaved && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: '#22c55e' }}>
                  <CheckCircle2 size={14} /> Notification preferences saved
                </span>
              )}
            </div>
            <button
              onClick={saveNotificationPrefs}
              disabled={notifSaving}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {notifSaving && <Loader2 size={14} className="animate-spin" />}
              {notifSaved ? 'Saved!' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* BRAND KIT TAB                                  */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'brandkit' && (
        <div className="space-y-6">
          {/* Colors card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Palette size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Brand Colors</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Used in AI-generated carousels and content styling
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'primary_color', label: 'Primary' },
                { key: 'secondary_color', label: 'Secondary' },
                { key: 'accent_color', label: 'Accent' },
              ].map(c => (
                <Field key={c.key} label={c.label}>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={(brandKit as any)[c.key]}
                      onChange={e => setBK(c.key, e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                      style={{ background: 'transparent' }}
                    />
                    <Input
                      value={(brandKit as any)[c.key]}
                      onChange={e => setBK(c.key, e.target.value)}
                      placeholder="#000000"
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
                    />
                  </div>
                </Field>
              ))}
            </div>

            {/* Color preview */}
            <div className="mt-5 flex gap-2">
              {[brandKit.primary_color, brandKit.secondary_color, brandKit.accent_color].map((c, i) => (
                <div
                  key={i}
                  className="h-12 flex-1 rounded-xl transition-all"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Fonts card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>Aa</span>
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Typography</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Font choices for generated carousel slides and content
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Heading Font">
                <Select value={brandKit.heading_font} onChange={e => setBK('heading_font', e.target.value)}>
                  {['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Roboto', 'Oswald', 'Lora', 'Raleway', 'DM Sans', 'Space Grotesk'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Body Font">
                <Select value={brandKit.body_font} onChange={e => setBK('body_font', e.target.value)}>
                  {['Inter', 'Poppins', 'Montserrat', 'Open Sans', 'Roboto', 'Lato', 'Nunito', 'DM Sans', 'Source Sans 3', 'Work Sans'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Font preview */}
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {brandKit.heading_font} Heading Preview
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {brandKit.body_font} — This is how your body text will look in generated content. Consistent typography builds brand recognition.
              </p>
            </div>
          </div>

          {/* Logo card */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Building2 size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Brand Logo</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Watermark or logo used in generated carousel slides
                </p>
              </div>
            </div>

            <Field label="Logo URL" hint="(paste a hosted image URL)">
              <Input
                value={brandKit.logo_url}
                onChange={e => setBK('logo_url', e.target.value)}
                placeholder="https://your-domain.com/logo.png"
              />
            </Field>

            {brandKit.logo_url && (
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandKit.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Logo preview</p>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={saveBrandKit}
              disabled={brandSaving}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {brandSaving ? <Loader2 size={14} className="animate-spin" /> : brandSaved ? <CheckCircle2 size={14} /> : null}
              {brandSaved ? 'Saved!' : brandSaving ? 'Saving...' : 'Save Brand Kit'}
            </button>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════ */}
      {/* AI ASSISTANTS TAB                              */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'ai_assistants' && (
        <div className="space-y-6">
          {/* Tone Presets */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tone Presets</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Select the AI writing tone for captions and replies</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'professional', label: 'Professional', desc: 'Polished and formal' },
                { id: 'casual',       label: 'Casual',       desc: 'Friendly and relaxed' },
                { id: 'witty',        label: 'Witty',        desc: 'Clever and humorous' },
                { id: 'bold',         label: 'Bold',         desc: 'Confident and direct' },
                { id: 'storyteller',  label: 'Storyteller',  desc: 'Narrative and engaging' },
                { id: 'expert',       label: 'Expert',       desc: 'Authoritative and detailed' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setAiConfig(prev => ({ ...prev, tone_preset: t.id }))}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: aiConfig.tone_preset === t.id ? 'var(--accent-subtle)' : 'var(--bg)',
                    border: `2px solid ${aiConfig.tone_preset === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <p className="font-semibold text-sm" style={{ color: aiConfig.tone_preset === t.id ? 'var(--accent)' : 'var(--text-primary)' }}>{t.label}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <MessageSquare size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Custom Instructions</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Provide specific guidelines for how the AI should generate content</p>
              </div>
            </div>
            <Textarea
              rows={5}
              value={aiConfig.custom_instructions}
              onChange={e => setAiConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
              placeholder="E.g. Always include a call-to-action. Keep sentences short. Avoid using emojis. Mention our brand tagline when appropriate..."
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              These instructions are prepended to every AI generation request for captions, replies, and content suggestions.
            </p>
          </div>

          {/* Response Length */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <Settings size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Response Length</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Control how long AI-generated captions and replies should be</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'short',  label: 'Short',  desc: '1-2 sentences' },
                { id: 'medium', label: 'Medium', desc: '3-5 sentences' },
                { id: 'long',   label: 'Long',   desc: '6+ sentences' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setAiConfig(prev => ({ ...prev, response_length: l.id }))}
                  className="rounded-xl p-4 text-center transition-all"
                  style={{
                    background: aiConfig.response_length === l.id ? 'var(--accent-subtle)' : 'var(--bg)',
                    border: `2px solid ${aiConfig.response_length === l.id ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <p className="font-semibold text-sm" style={{ color: aiConfig.response_length === l.id ? 'var(--accent)' : 'var(--text-primary)' }}>{l.label}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={saveAiConfig}
              disabled={aiSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {aiSaving ? <Loader2 size={14} className="animate-spin" /> : aiSaved ? <CheckCircle2 size={14} /> : null}
              {aiSaved ? 'Saved!' : aiSaving ? 'Saving...' : 'Save AI Config'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* HOOK PHOTO TAB                                 */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'hookphoto' && (
        <div className="space-y-6">
          {/* Hook Image Upload */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <ImagePlus size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Default Hook Photo</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Set a default first-frame image used for all your reels</p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              A hook photo is the cover/thumbnail image that appears as the first frame of your reel. A strong hook photo grabs attention and increases views.
            </p>

            <Field label="Hook Photo URL" hint="(paste a direct image link)">
              <Input
                value={hookPhotoUrl}
                onChange={e => setHookPhotoUrl(e.target.value)}
                placeholder="https://example.com/my-hook-image.jpg"
              />
            </Field>

            {/* Preview */}
            {hookPhotoUrl && (
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Preview</p>
                <div
                  className="rounded-xl overflow-hidden relative w-full max-w-[200px]"
                  style={{ maxWidth: 200, background: 'var(--bg)', border: '1px solid var(--border)', aspectRatio: '9/16' }}
                >
                  <img
                    src={hookPhotoUrl}
                    alt="Hook photo preview"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs font-semibold text-center"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    9:16 Reel Cover
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="card p-6">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tips for a Great Hook Photo</h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <p>• Use a 9:16 aspect ratio (1080×1920px) for best results</p>
              <p>• Include bold, readable text overlay</p>
              <p>• Use high-contrast colors that stand out in the feed</p>
              <p>• Show a face or emotion — it increases click-through</p>
              <p>• Keep it consistent with your brand style</p>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={saveHookPhoto}
              disabled={hookSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {hookSaving ? <Loader2 size={14} className="animate-spin" /> : hookSaved ? <CheckCircle2 size={14} /> : null}
              {hookSaved ? 'Saved!' : hookSaving ? 'Saving...' : 'Save Hook Photo'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* DANGER ZONE TAB                                */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div className="space-y-6">
          {/* Export data */}
          <div
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Download size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Export Your Data
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Download all your posts, schedules, and business profile as JSON
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <Download size={14} />
              Export data
            </button>
          </div>

          {/* Disconnect all accounts */}
          <div
            className="card p-6"
            style={{
              background: 'rgba(249,115,22,0.04)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)' }}
              >
                <Unplug size={15} style={{ color: '#f97316' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#f97316' }}>
                  Disconnect All Accounts
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Remove all connected Instagram accounts. You can reconnect them anytime.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to disconnect all Instagram accounts?')) return
                try {
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  await supabase.from('social_accounts').delete().eq('user_id', user!.id)
                  alert('All accounts disconnected successfully.')
                  router.refresh()
                } catch (e: any) {
                  alert('Failed: ' + e.message)
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.3)',
                color: '#f97316',
              }}
            >
              <Unplug size={14} />
              Disconnect all accounts
            </button>
          </div>

          {/* Delete all posts */}
          <div
            className="card p-6"
            style={{
              background: 'rgba(249,115,22,0.04)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)' }}
              >
                <RefreshCw size={15} style={{ color: '#f97316' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#f97316' }}>
                  Delete All Posts &amp; Schedules
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Remove all post history and scheduled content. Published posts on Instagram will not be affected.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Delete ALL posts and schedules from PostPilot? This cannot be undone. Posts already published on Instagram will remain there.')) return
                try {
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  await Promise.all([
                    supabase.from('post_logs').delete().eq('user_id', user!.id),
                    supabase.from('schedules').delete().eq('user_id', user!.id),
                  ])
                  alert('All posts and schedules deleted.')
                  router.refresh()
                } catch (e: any) {
                  alert('Failed: ' + e.message)
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.3)',
                color: '#f97316',
              }}
            >
              <RefreshCw size={14} />
              Delete all posts &amp; schedules
            </button>
          </div>

          {/* Transfer workspace ownership */}
          <div
            className="card p-6"
            style={{
              background: 'rgba(249,115,22,0.04)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)' }}
              >
                <Send size={15} style={{ color: '#f97316' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#f97316' }}>
                  Transfer Workspace Ownership
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Hand over ownership of your workspace to another team member. You will become an admin.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Input
                id="transfer-email"
                placeholder="new-owner@example.com"
                style={{ ...inputStyle, maxWidth: 300 }}
              />
              <button
                onClick={async () => {
                  const emailEl = document.getElementById('transfer-email') as HTMLInputElement
                  const email = emailEl?.value?.trim()
                  if (!email) { alert('Enter the new owner email.'); return }
                  if (!confirm(`Transfer workspace ownership to ${email}? You will become an admin.`)) return
                  try {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    // Find workspace
                    const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', user!.id).single()
                    if (!ws) { alert('No workspace found. Create a workspace first.'); return }
                    // Find team member
                    const { data: member } = await supabase.from('team_members')
                      .select('id, user_id')
                      .eq('workspace_id', ws.id)
                      .eq('email', email)
                      .single()
                    if (!member || !member.user_id) { alert('Team member not found or has not accepted invite yet.'); return }
                    // Transfer: update workspace owner + swap roles
                    await supabase.from('workspaces').update({ owner_id: member.user_id }).eq('id', ws.id)
                    await supabase.from('team_members').update({ role: 'admin' }).eq('workspace_id', ws.id).eq('user_id', user!.id)
                    alert('Ownership transferred successfully!')
                    router.refresh()
                  } catch (e: any) {
                    alert('Transfer failed: ' + e.message)
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 whitespace-nowrap"
                style={{
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.3)',
                  color: '#f97316',
                }}
              >
                <Send size={14} />
                Transfer
              </button>
            </div>
          </div>

          {/* Delete account */}
          <div
            className="card p-6"
            style={{
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                <Trash2 size={15} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#ef4444' }}>
                  Delete Account
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>What will be deleted:</p>
                <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                  <li>• All posts, schedules, and drafts</li>
                  <li>• Connected Instagram accounts</li>
                  <li>• Business profile and brand kit</li>
                  <li>• Team workspace and member data</li>
                  <li>• Referral history and earnings</li>
                  <li>• All analytics and engagement data</li>
                </ul>
              </div>
              <Field label="Type DELETE to confirm">
                <Input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  style={{
                    ...inputStyle,
                    borderColor: deleteConfirm === 'DELETE' ? '#ef4444' : undefined,
                  }}
                />
              </Field>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-30"
              style={{ background: '#ef4444' }}
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                <Trash2 size={14} />
                Delete my account permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}