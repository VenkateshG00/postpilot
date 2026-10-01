'use client'

import { useState } from 'react'
import {
  Film, Play, Pause, Trash2, BarChart3, Eye, Heart,
  MessageCircle, Share2, TrendingUp, Clock, Loader2,
  AlertTriangle, CheckCircle2, Upload, Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/* ── Types ─────────────────────────────────────────── */
interface Account {
  id: string
  account_name: string | null
  platform: string
}

interface TrialReel {
  id: string
  user_id: string
  account_id: string
  caption: string | null
  image_url: string | null
  content_type: string
  status: string
  is_trial: boolean
  trial_views?: number
  trial_likes?: number
  trial_comments?: number
  trial_shares?: number
  trial_reach?: number
  created_at: string
}

type TabId = 'active' | 'completed' | 'promoted'

/* ── Helpers ───────────────────────────────────────── */
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

/* ── Component ─────────────────────────────────────── */
export default function TrialReelsClient({
  accounts,
  trials: initTrials,
}: {
  accounts: Account[]
  trials: TrialReel[]
}) {
  const [trials, setTrials] = useState(initTrials)
  const [tab, setTab] = useState<TabId>('active')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)

  const activeTrials = trials.filter(t => t.status === 'trial_active')
  const completedTrials = trials.filter(t => t.status === 'trial_completed')
  const promotedTrials = trials.filter(t => t.status === 'published')

  const tabItems: { id: TabId; label: string; count: number }[] = [
    { id: 'active',    label: 'Active Trials',   count: activeTrials.length },
    { id: 'completed', label: 'Completed',        count: completedTrials.length },
    { id: 'promoted',  label: 'Promoted to Feed', count: promotedTrials.length },
  ]

  const currentTrials = tab === 'active' ? activeTrials : tab === 'completed' ? completedTrials : promotedTrials

  async function deleteTrial(id: string) {
    if (!confirm('Remove this trial reel?')) return
    setDeleting(id)
    try {
      const supabase = createClient()
      await supabase.from('post_logs').delete().eq('id', id)
      setTrials(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function promoteToFeed(id: string) {
    setPromoting(id)
    try {
      const supabase = createClient()
      await supabase.from('post_logs').update({ is_trial: false, status: 'published' }).eq('id', id)
      setTrials(prev => prev.map(t => t.id === id ? { ...t, status: 'published', is_trial: false } : t))
    } finally {
      setPromoting(null)
    }
  }

  /* ── Aggregate metrics for overview ─────────────── */
  const totalViews = trials.reduce((s, t) => s + (t.trial_views ?? 0), 0)
  const totalLikes = trials.reduce((s, t) => s + (t.trial_likes ?? 0), 0)
  const totalReach = trials.reduce((s, t) => s + (t.trial_reach ?? 0), 0)
  const avgEngagement = totalViews > 0 ? (((totalLikes + trials.reduce((s, t) => s + (t.trial_comments ?? 0), 0)) / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Trial Reels</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Test reel performance before publishing to your main feed
          </p>
        </div>
        <Link
          href="/dashboard/reels"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <Sparkles size={14} />
          Create Trial Reel
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Trial Views', value: formatNum(totalViews), icon: Eye, color: '#8b5cf6' },
          { label: 'Total Likes',       value: formatNum(totalLikes), icon: Heart, color: '#ef4444' },
          { label: 'Trial Reach',       value: formatNum(totalReach), icon: TrendingUp, color: '#22c55e' },
          { label: 'Avg Engagement',    value: avgEngagement + '%', icon: BarChart3, color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '15' }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {tabItems.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-muted)',
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* How it works */}
      {trials.length === 0 && (
        <div className="rounded-2xl p-8 text-center mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-subtle)' }}>
            <Film size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Test Before You Post</h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Trial reels let you test content with a limited audience first. Track metrics like views, engagement, and reach
            before deciding to promote it to your full feed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { step: '1', title: 'Create', desc: 'Make a reel and mark it as trial' },
              { step: '2', title: 'Analyze', desc: 'Track performance metrics' },
              { step: '3', title: 'Promote', desc: 'Push winners to your main feed' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {s.step}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trial list */}
      {currentTrials.length === 0 && trials.length > 0 && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Film size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} className="mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No {tab} trial reels</p>
        </div>
      )}

      <div className="space-y-3">
        {currentTrials.map(trial => {
          const acct = accounts.find(a => a.id === trial.account_id)
          return (
            <div
              key={trial.id}
              className="rounded-2xl p-4 flex flex-col sm:flex-row gap-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {/* Thumbnail */}
              <div className="w-full sm:w-32 h-48 sm:h-44 rounded-xl overflow-hidden shrink-0 relative" style={{ background: 'var(--bg)' }}>
                {trial.image_url ? (
                  <img src={trial.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{
                  background: trial.status === 'trial_active' ? '#8b5cf6' : trial.status === 'published' ? '#22c55e' : '#6b7280'
                }}>
                  {trial.status === 'trial_active' ? 'ACTIVE' : trial.status === 'published' ? 'PROMOTED' : 'DONE'}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {trial.caption || 'Untitled trial reel'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {acct?.account_name ?? 'Unknown'} • {timeAgo(trial.created_at)}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-5 gap-3 mt-3">
                  {[
                    { icon: Eye, value: trial.trial_views ?? 0, label: 'Views' },
                    { icon: Heart, value: trial.trial_likes ?? 0, label: 'Likes' },
                    { icon: MessageCircle, value: trial.trial_comments ?? 0, label: 'Comments' },
                    { icon: Share2, value: trial.trial_shares ?? 0, label: 'Shares' },
                    { icon: TrendingUp, value: trial.trial_reach ?? 0, label: 'Reach' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <m.icon size={14} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatNum(m.value)}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {trial.status === 'trial_completed' && (
                    <button
                      onClick={() => promoteToFeed(trial.id)}
                      disabled={promoting === trial.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      {promoting === trial.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Promote to Feed
                    </button>
                  )}
                  <button
                    onClick={() => deleteTrial(trial.id)}
                    disabled={deleting === trial.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {deleting === trial.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
