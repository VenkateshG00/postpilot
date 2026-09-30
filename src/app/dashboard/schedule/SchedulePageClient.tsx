'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, X, Clock, Calendar, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { pillarsForIndustry } from '@/lib/pillars'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CONTENT_TYPES = [
  { value: 'post',      label: 'Photo post' },
  { value: 'carousel',  label: 'Carousel' },
  { value: 'reel',      label: 'Reel' },
  { value: 'story',     label: 'Story' },
]

const FREQ_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Specific days',
  custom: 'Custom',
}

interface Props {
  schedules: any[]
  accounts: any[]
  industry?: string | null
  topics?: string[] | null
}

/* ── Toggle switch ────────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center shrink-0 transition-all"
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s',
      }}
    >
      <span
        className="absolute rounded-full bg-white shadow"
        style={{
          width: 14,
          height: 14,
          left: on ? 18 : 3,
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

/* ── Label / input wrappers ──────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    />
  )
}

function Select({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all appearance-none"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    />
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function SchedulePageClient({ schedules: initial, accounts, industry, topics }: Props) {
  const router = useRouter()
  const [schedules, setSchedules] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: 'Daily Posts',
    social_account_id: accounts[0]?.id || '',
    frequency: 'daily',
    post_times: ['09:00'],
    days_of_week: [] as number[],
    content_type: 'post',
    theme: '',
  })

  const suggestions = topics?.length ? topics : pillarsForIndustry(industry)

  /* ── Form helpers ── */
  function addTime() {
    if (form.post_times.length < 5)
      setForm(f => ({ ...f, post_times: [...f.post_times, '12:00'] }))
  }
  function updateTime(i: number, v: string) {
    const t = [...form.post_times]; t[i] = v
    setForm(f => ({ ...f, post_times: t }))
  }
  function removeTime(i: number) {
    setForm(f => ({ ...f, post_times: f.post_times.filter((_, idx) => idx !== i) }))
  }
  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d],
    }))
  }

  /* ── Save ── */
  async function saveSchedule() {
    if (!form.social_account_id) return alert('Connect an Instagram account first.')
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { theme, ...rest } = form
    const payload = {
      ...rest,
      user_id: user!.id,
      days_of_week: form.days_of_week.length ? form.days_of_week : null,
      topics: theme.trim() ? [theme.trim()] : null,
    }
    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('*, social_accounts(account_name, platform)')
      .single()
    setSaving(false)
    if (error) { alert(error.message); return }
    setSchedules(s => [...s, data])
    setShowForm(false)
    router.refresh()
  }

  async function toggleSchedule(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('schedules').update({ is_active: !current }).eq('id', id)
    setSchedules(s => s.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return
    const supabase = createClient()
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(s => s.filter(x => x.id !== id))
  }

  /* ── Render ── */
  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Posting Schedules
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Define when PostPilot auto-publishes content for you
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={14} /> New schedule
        </button>
      </div>

      {/* ── Slide-in form ── */}
      {showForm && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>New schedule</h2>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Schedule name">
                <Input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Daily Posts"
                />
              </Field>
              <Field label="Instagram account">
                <Select
                  value={form.social_account_id}
                  onChange={e => setForm(f => ({ ...f, social_account_id: e.target.value }))}
                >
                  {accounts.length === 0 && <option value="">No accounts connected</option>}
                  {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Content type">
                <Select
                  value={form.content_type}
                  onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                >
                  {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Frequency">
                <Select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </Select>
              </Field>
            </div>

            <Field label="Topic / theme">
              <Input
                type="text"
                list="pillar-suggestions"
                value={form.theme}
                onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                placeholder={`e.g. ${suggestions.slice(0, 2).join(', ')}`}
              />
              <datalist id="pillar-suggestions">
                {suggestions.map(t => <option key={t} value={t} />)}
              </datalist>
            </Field>

            {form.frequency === 'weekly' && (
              <Field label="Days of week">
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className="w-10 h-10 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: form.days_of_week.includes(i) ? 'var(--accent)' : 'var(--bg)',
                        color: form.days_of_week.includes(i) ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Posting times (your timezone)">
              <div className="space-y-2">
                {form.post_times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={t}
                      onChange={e => updateTime(i, e.target.value)}
                      style={{ maxWidth: 140 }}
                    />
                    {form.post_times.length > 1 && (
                      <button type="button" onClick={() => removeTime(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {form.post_times.length < 5 && (
                  <button
                    type="button"
                    onClick={addTime}
                    className="text-xs font-semibold flex items-center gap-1 mt-1 hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Plus size={12} /> Add another time
                  </button>
                )}
              </div>
            </Field>
          </div>

          <div
            className="flex justify-end gap-3 mt-6 pt-5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save schedule
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule list ── */}
      {schedules.length === 0 && !showForm ? (
        <div
          className="rounded-2xl p-14 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Clock size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No schedules yet</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Create a schedule and PostPilot will auto-post at your chosen times.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} /> Create schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => {
            const dayLabel = s.frequency === 'daily' || !s.days_of_week?.length
              ? 'Every day'
              : [...s.days_of_week].sort((a: number, b: number) => a - b).map((d: number) => DAYS[d]).join(', ')

            return (
              <div
                key={s.id}
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: s.is_active ? '#22c55e' : 'var(--border)' }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                      {s.content_type}
                    </span>
                    {s.topics?.[0] && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                      >
                        {s.topics[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={10} />
                    {dayLabel}
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <Clock size={10} />
                    {s.post_times?.join(', ')}
                    {s.social_accounts && (
                      <>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        @{s.social_accounts.account_name}
                      </>
                    )}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle on={s.is_active} onToggle={() => toggleSchedule(s.id, s.is_active)} />
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--text-muted)' }}
                    title="Delete schedule"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
