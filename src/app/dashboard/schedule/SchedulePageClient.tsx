'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Trash2, Loader2, X, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CONTENT_TYPES = [
  { value: 'post', label: 'Photo post' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' }
]

interface Props {
  schedules: any[]
  accounts: any[]
}

export default function SchedulePageClient({ schedules: initial, accounts }: Props) {
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
    theme: ''
  })

  function addTime() {
    if (form.post_times.length < 5) {
      setForm(f => ({ ...f, post_times: [...f.post_times, '12:00'] }))
    }
  }

  function updateTime(i: number, val: string) {
    const times = [...form.post_times]
    times[i] = val
    setForm(f => ({ ...f, post_times: times }))
  }

  function removeTime(i: number) {
    setForm(f => ({ ...f, post_times: f.post_times.filter((_, idx) => idx !== i) }))
  }

  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d]
    }))
  }

  async function saveSchedule() {
    if (!form.social_account_id) return alert('Please connect an Instagram account first.')
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { theme, ...rest } = form
    const payload = { ...rest, user_id: user!.id, days_of_week: form.days_of_week.length ? form.days_of_week : null, topics: theme.trim() ? [theme.trim()] : null }
    const { data, error } = await supabase.from('schedules').insert(payload).select('*, social_accounts(account_name, platform)').single()
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

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Posting schedules</h1>
          <p className="text-sm text-gray-500 mt-1">Define when PostPilot publishes content for you</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={14} /> New schedule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-6 mb-6 border-brand-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium text-gray-900">New schedule</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Schedule name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="label">Instagram account</label>
                <select
                  value={form.social_account_id}
                  onChange={e => setForm(f => ({ ...f, social_account_id: e.target.value }))}
                  className="input-base"
                >
                  {accounts.length === 0 && <option value="">No accounts connected</option>}
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>@{a.account_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Content type</label>
                <select
                  value={form.content_type}
                  onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                  className="input-base"
                >
                  {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="input-base"
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Topic / theme <span className="text-gray-400 font-normal">(what these posts are about)</span></label>
              <input
                type="text"
                list="pillar-suggestions"
                value={form.theme}
                onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                placeholder="e.g. New listings, Buying tips, Client stories"
                className="input-base"
              />
              <datalist id="pillar-suggestions">
                <option value="New property listings" />
                <option value="Home buying tips" />
                <option value="Investment insights" />
                <option value="Client success stories" />
                <option value="Behind the scenes" />
                <option value="Local market updates" />
              </datalist>
            </div>

            {form.frequency === 'weekly' && (
              <div>
                <label className="label">Days of week</label>
                <div className="flex gap-2">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-xs font-medium transition-colors',
                        form.days_of_week.includes(i)
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">Posting times (your timezone)</label>
              <div className="space-y-2">
                {form.post_times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={t}
                      onChange={e => updateTime(i, e.target.value)}
                      className="input-base w-36"
                    />
                    {form.post_times.length > 1 && (
                      <button type="button" onClick={() => removeTime(i)} className="text-gray-400 hover:text-red-500 p-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {form.post_times.length < 5 && (
                  <button type="button" onClick={addTime} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add another time
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveSchedule} disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save schedule
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {schedules.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <Clock size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">No schedules yet. Create one to start auto-posting.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
            <Plus size={14} /> Create schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className="card p-5 flex items-center gap-4">
              <div className={cn('w-2 h-2 rounded-full shrink-0', s.is_active ? 'bg-emerald-400' : 'bg-gray-300')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{s.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                    {s.content_type}
                  </span>
                  {s.topics?.[0] && (
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{s.topics[0]}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.frequency === 'daily' || !s.days_of_week?.length
                    ? 'Every day'
                    : [...s.days_of_week].sort((a: number, b: number) => a - b).map((d: number) => DAYS[d]).join(', ')}
                  {' · '}
                  {s.post_times?.join(', ')}
                  {s.social_accounts && ` · @${s.social_accounts.account_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSchedule(s.id, s.is_active)}
                  className={cn('text-xs px-3 py-1.5 rounded-lg transition-colors font-medium',
                    s.is_active
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {s.is_active ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => deleteSchedule(s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
