'use client'

import { useState } from 'react'
import {
  Plus, Zap, MessageSquare, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertTriangle, Instagram, Search, ChevronDown, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ── Types ────────────────────────────────────────── */
interface Automation {
  id: string
  user_id: string
  account_id: string | null
  name: string
  trigger_type: 'comment_keyword' | 'any_comment' | 'dm_keyword'
  trigger_keywords: string[]
  reply_template: string
  reply_type: 'dm' | 'comment'
  is_active: boolean
  created_at: string
}

interface Account {
  id: string
  account_name: string
  platform: string
  profile_picture_url: string | null
}

const TRIGGER_TYPES = [
  { id: 'comment_keyword', label: 'Comment contains keyword', desc: 'Triggers when a comment includes specific words' },
  { id: 'any_comment',     label: 'Any comment',              desc: 'Triggers on every new comment' },
  { id: 'dm_keyword',      label: 'DM contains keyword',      desc: 'Triggers when a DM includes specific words' },
] as const

/* ── Shared styles ────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

/* ── Component ────────────────────────────────────── */
export default function AutomationsClient({
  accounts,
  initialAutomations,
}: {
  accounts: Account[]
  initialAutomations: Automation[]
}) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /* New automation form */
  const [form, setForm] = useState({
    name: '',
    account_id: accounts[0]?.id ?? '',
    trigger_type: 'comment_keyword' as Automation['trigger_type'],
    trigger_keywords: '',
    reply_template: '',
    reply_type: 'dm' as 'dm' | 'comment',
  })

  function setF(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  /* Create */
  async function handleCreate() {
    if (!form.name.trim() || !form.reply_template.trim()) return
    if (form.trigger_type !== 'any_comment' && !form.trigger_keywords.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('automations').insert({
        user_id: user!.id,
        account_id: form.account_id || null,
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        trigger_keywords: form.trigger_type === 'any_comment'
          ? []
          : form.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean),
        reply_template: form.reply_template.trim(),
        reply_type: form.reply_type,
        is_active: true,
      }).select().single()
      if (error) throw error
      setAutomations(prev => [data as Automation, ...prev])
      setCreating(false)
      setForm({ name: '', account_id: accounts[0]?.id ?? '', trigger_type: 'comment_keyword', trigger_keywords: '', reply_template: '', reply_type: 'dm' })
    } catch (e: any) {
      alert('Failed to create: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  /* Toggle */
  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id)
    try {
      const supabase = createClient()
      await supabase.from('automations').update({ is_active: !current }).eq('id', id)
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a))
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setTogglingId(null)
    }
  }

  /* Delete */
  async function handleDelete(id: string) {
    if (!confirm('Delete this automation?')) return
    setDeletingId(id)
    try {
      const supabase = createClient()
      await supabase.from('automations').delete().eq('id', id)
      setAutomations(prev => prev.filter(a => a.id !== id))
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const hasAccounts = accounts.length > 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-heading"><em>Automations</em>.</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Auto-reply to comments and DMs with custom rules
          </p>
        </div>
        {hasAccounts && (
          <button
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Rule</span>
          </button>
        )}
      </div>

      {/* No accounts warning */}
      {!hasAccounts && (
        <div
          className="card p-6 text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(245,158,11,0.1)' }}
          >
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            Instagram not connected
          </h2>
          <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Connect your Instagram account first to set up automations for comments and DMs.
          </p>
          <a
            href="/dashboard/connect"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Instagram size={15} />
            Connect Instagram
          </a>
        </div>
      )}

      {/* Empty state */}
      {hasAccounts && automations.length === 0 && !creating && (
        <div
          className="card p-6 text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Zap size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            No automations yet
          </h2>
          <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Create your first automation to auto-reply when someone comments on your posts or sends you a DM.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={15} />
            Create first automation
          </button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div
          className="card p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              New Automation Rule
            </h2>
            <button onClick={() => setCreating(false)} className="p-1 rounded-lg hover:bg-white/5">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Rule Name</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => setF('name', e.target.value)}
                placeholder="e.g., Price inquiry auto-reply"
              />
            </div>

            {/* Account */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Account</label>
              <select
                style={{ ...inputStyle, appearance: 'none' as const }}
                value={form.account_id}
                onChange={e => setF('account_id', e.target.value)}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>@{a.account_name}</option>
                ))}
              </select>
            </div>

            {/* Trigger type */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Trigger</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TRIGGER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setF('trigger_type', t.id)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: form.trigger_type === t.id ? 'var(--accent-subtle)' : 'var(--bg)',
                      border: `1px solid ${form.trigger_type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: form.trigger_type === t.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {t.label}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            {form.trigger_type !== 'any_comment' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Keywords <span className="font-normal opacity-60">(comma-separated)</span>
                </label>
                <input
                  style={inputStyle}
                  value={form.trigger_keywords}
                  onChange={e => setF('trigger_keywords', e.target.value)}
                  placeholder="price, cost, how much, buy"
                />
              </div>
            )}

            {/* Reply type */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Reply via</label>
              <div className="flex gap-2">
                {(['dm', 'comment'] as const).map(rt => (
                  <button
                    key={rt}
                    onClick={() => setF('reply_type', rt)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-all"
                    style={{
                      background: form.reply_type === rt ? 'var(--accent-subtle)' : 'var(--bg)',
                      border: `1px solid ${form.reply_type === rt ? 'var(--accent)' : 'var(--border)'}`,
                      color: form.reply_type === rt ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <MessageSquare size={14} />
                    {rt === 'dm' ? 'Direct Message' : 'Comment Reply'}
                  </button>
                ))}
              </div>
            </div>

            {/* Reply template */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Reply Template
              </label>
              <textarea
                style={{ ...inputStyle, resize: 'none' as const, minHeight: 80 }}
                value={form.reply_template}
                onChange={e => setF('reply_template', e.target.value)}
                placeholder="Hi! Thanks for your interest. Check out our link in bio for pricing details."
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                Use {'{{username}}'} to insert the commenter&apos;s name
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim() || !form.reply_template.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-40"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automations list */}
      {automations.length > 0 && (
        <div className="space-y-3">
          {automations.map(a => {
            const acct = accounts.find(ac => ac.id === a.account_id)
            return (
              <div
                key={a.id}
                className="card p-6 transition-all"
                style={{
                  opacity: a.is_active ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} style={{ color: a.is_active ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.name}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: a.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)',
                          color: a.is_active ? '#22c55e' : '#9ca3af',
                        }}
                      >
                        {a.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {acct && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                          @{acct.account_name}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        {TRIGGER_TYPES.find(t => t.id === a.trigger_type)?.label ?? a.trigger_type}
                      </span>
                      {a.trigger_keywords.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          Keywords: {a.trigger_keywords.join(', ')}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        Reply via {a.reply_type === 'dm' ? 'DM' : 'Comment'}
                      </span>
                    </div>

                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      &ldquo;{a.reply_template}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(a.id, a.is_active)}
                      disabled={togglingId === a.id}
                      className="p-2 rounded-lg transition-opacity hover:opacity-70"
                      title={a.is_active ? 'Pause' : 'Activate'}
                    >
                      {togglingId === a.id
                        ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                        : a.is_active
                          ? <ToggleRight size={22} style={{ color: '#22c55e' }} />
                          : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="p-2 rounded-lg transition-opacity hover:opacity-70"
                      title="Delete"
                    >
                      {deletingId === a.id
                        ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                        : <Trash2 size={15} style={{ color: '#ef4444' }} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info note */}
      {hasAccounts && automations.length > 0 && (
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Automations run via webhook when Instagram sends comment/DM events. Ensure your Instagram account supports the Messaging API for DM automations.
        </p>
      )}
    </div>
  )
}
