'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, X, Clock, Calendar, ToggleLeft, ToggleRight,
  Zap, Edit3, Check, Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { pillarsForIndustry } from '@/lib/pillars'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CONTENT_TYPES = [
  { value: 'post', label: 'Photo post' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
]

const BEST_TIMES = [
  { label: 'Morning', time: '09:00', desc: 'Great for professionals' },
  { label: 'Lunch', time: '12:30', desc: 'Peak engagement window' },
  { label: 'Evening', time: '18:00', desc: 'After-work scrolling' },
  { label: 'Night', time: '21:00', desc: 'Highest reach for reels' },
]

interface Props {
  schedules: any[]
  accounts: any[]
  industry?: string | null
  topics?: string[] | null
}

/* ── Toggle switch ─────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center shrink-0 transition-all"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? 'var(--accent)' : 'var(--border)',
        transition: 'background 0.2s',
      }}
    >
      <span
        className="absolute rounded-full bg-white shadow-sm"
        style={{
          width: 18,
          height: 18,
          left: on ? 22 : 3,
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

/* ── Field / Input wrappers ────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all'
const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} style={{ ...inputStyle, ...props.style }} />
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputCls} appearance-none`}
      style={{ ...inputStyle, ...props.style }}
    />
  )
}

/* ── Main ──────────────────────────────────────────── */
export default function SchedulePageClient({ schedules: initial, accounts, industry, topics }: Props) {
  const router = useRouter()
  const [schedules, setSchedules] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function resetForm() {
    setForm({
      name: 'Daily Posts',
      social_account_id: accounts[0]?.id || '',
      frequency: 'daily',
      post_times: ['09:00'],
      days_of_week: [],
      content_type: 'post',
      theme: '',
    })
    setEditingId(null)
  }

  function addTime() {
    if (form.post_times.length < 5)
      setForm(f => ({ ...f, post_times: [...f.post_times, '12:00'] }))
  }
  function updateTime(i: number, v: string) {
    const t = [...form.post_times]
    t[i] = v
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

  function startEdit(s: any) {
    setForm({
      name: s.name || '',
      social_account_id: s.social_account_id || accounts[0]?.id || '',
      frequency: s.frequency || 'daily',
      post_times: s.post_times || ['09:00'],
      days_of_week: s.days_of_week || [],
      content_type: s.content_type || 'post',
      theme: s.custom_topics?.[0] || s.topics?.[0] || '',
    })
    setEditingId(s.id)
    setShowForm(true)
  }

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

    if (editingId) {
      const { user_id, ...updatePayload } = payload
      const { error } = await supabase
        .from('schedules')
        .update(updatePayload)
        .eq('id', editingId)
      if (error) { alert(error.message); setSaving(false); return }
      setSchedules(s =>
        s.map(x => (x.id === editingId ? { ...x, ...updatePayload } : x))
      )
    } else {
      const { data, error } = await supabase
        .from('schedules')
        .insert(payload)
        .select('*, social_accounts(account_name, platform)')
        .single()
      if (error) { alert(error.message); setSaving(false); return }
      setSchedules(s => [...s, data])
    }

    setSaving(false)
    setShowForm(false)
    resetForm()
    router.refresh()
  }

  async function toggleSchedule(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('schedules').update({ is_active: !current }).eq('id', id)
    setSchedules(s => s.map(x => (x.id === id ? { ...x, is_active: !current } : x)))
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return
    const supabase = createClient()
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(s => s.filter(x => x.id !== id))
  }

  const activeCount = schedules.filter(s => s.is_active).length
  const totalPostsPerWeek = schedules
    .filter(s => s.is_active)
    .reduce((sum, s) => {
      const timesPerDay = s.post_times?.length ?? 1
      if (s.frequency === 'daily') return sum + timesPerDay * 7
      return sum + timesPerDay * (s.days_of_week?.length ?? 0)
    }, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-heading">
            Create <em>schedule</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Define when PostPilot auto-publishes content for you
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="btn-primary flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={14} /> New schedule
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div
          className="card p-6"
        >
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Active Schedules
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeCount}</p>
        </div>
        <div
          className="card p-6"
        >
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Posts / Week
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalPostsPerWeek}</p>
        </div>
        <div
          className="rounded-xl p-4 hidden sm:block"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Accounts
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{accounts.length}</p>
        </div>
      </div>

      {/* Best times suggestion */}
      <div
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            Best Times to Post
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            AI recommended
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BEST_TIMES.map(bt => (
            <button
              key={bt.time}
              type="button"
              onClick={() => {
                if (!showForm) { resetForm(); setShowForm(true) }
                if (!form.post_times.includes(bt.time) && form.post_times.length < 5) {
                  setForm(f => ({ ...f, post_times: [...f.post_times.filter(t => t !== '09:00' || f.post_times.length > 1), bt.time] }))
                }
              }}
              className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{bt.time}</p>
              <p className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{bt.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{bt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Create / Edit form ── */}
      {showForm && (
        <div
          className="card p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {editingId ? 'Edit schedule' : 'New schedule'}
            </h2>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>@{a.account_name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Content type">
                <Select
                  value={form.content_type}
                  onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                >
                  {CONTENT_TYPES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
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
                {suggestions.map((t: string) => (
                  <option key={t} value={t} />
                ))}
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

            <Field label="Posting times">
              <div className="space-y-2">
                {form.post_times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <Input type="time" value={t} onChange={e => updateTime(i, e.target.value)} style={{ maxWidth: 160 }} />
                    {form.post_times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTime(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
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
            className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="btn-secondary text-center"
            >
              Cancel
            </button>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingId ? 'Update schedule' : 'Save schedule'}
            </button>
          </div>
        </div>
      )}

      {/* ── Weekly overview grid ── */}
      {schedules.length > 0 && !showForm && (
        <div
          className="card overflow-hidden mb-6"
        >
          <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Weekly Posting Overview
            </h3>
          </div>
          <div className="overflow-x-auto">
          <div className="grid grid-cols-7 text-center min-w-[420px]">
            {DAYS.map((day, di) => {
              const count = schedules
                .filter(s => s.is_active)
                .filter(s => {
                  if (s.frequency === 'daily') return true
                  return s.days_of_week?.includes(di)
                })
                .reduce((sum: number, s: any) => sum + (s.post_times?.length ?? 0), 0)
              return (
                <div
                  key={day}
                  className="py-3 sm:py-4"
                  style={{ borderRight: di < 6 ? '1px solid var(--border)' : undefined }}
                >
                  <p className="text-[10px] sm:text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    {day}
                  </p>
                  <p
                    className="text-base sm:text-lg font-bold"
                    style={{ color: count > 0 ? 'var(--accent)' : 'var(--text-muted)', opacity: count > 0 ? 1 : 0.3 }}
                  >
                    {count}
                  </p>
                  <p className="text-[9px] sm:text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {count === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              )
            })}
          </div>
          </div>
        </div>
      )}

      {/* ── Schedule list ── */}
      {schedules.length === 0 && !showForm ? (
        <div
          className="card p-6 text-center"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Clock size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            No schedules yet
          </p>
          <p className="text-xs mb-5 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            Create a schedule and PostPilot will auto-post at your chosen times.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={14} /> Create schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => {
            const dayLabel =
              s.frequency === 'daily' || !s.days_of_week?.length
                ? 'Every day'
                : [...s.days_of_week]
                    .sort((a: number, b: number) => a - b)
                    .map((d: number) => DAYS[d])
                    .join(', ')

            return (
              <div
                key={s.id}
                className="card p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                {/* Status dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 hidden sm:block"
                  style={{ background: s.is_active ? '#22c55e' : 'var(--border)' }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {/* Mobile status dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0 sm:hidden"
                      style={{ background: s.is_active ? '#22c55e' : 'var(--border)' }}
                    />
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
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
                  <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
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
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => startEdit(s)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    title="Edit schedule"
                  >
                    <Edit3 size={13} />
                  </button>
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
