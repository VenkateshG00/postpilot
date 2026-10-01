'use client'

import { useState } from 'react'
import { ExternalLink, Grid3X3, List, Image, AlertCircle, Clock, CheckCircle2, Filter } from 'lucide-react'
import { formatDateIST, friendlyPostError } from '@/lib/utils'

type Status = 'all' | 'published' | 'scheduled' | 'failed' | 'pending'

const STATUS_TABS: { value: Status; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending',   label: 'Pending' },
  { value: 'failed',    label: 'Failed' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    published: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', icon: <CheckCircle2 size={9} /> },
    scheduled: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: <Clock size={9} /> },
    pending:   { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', icon: <Clock size={9} /> },
    failed:    { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', icon: <AlertCircle size={9} /> },
  }
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', icon: null }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon}{status}
    </span>
  )
}

function dateLabel(log: any) {
  if (log.status === 'published' && log.published_at) return formatDateIST(log.published_at)
  if (log.status === 'scheduled' && log.scheduled_for) return `→ ${formatDateIST(log.scheduled_for)}`
  return formatDateIST(log.created_at)
}

/* ── Grid card ─────────────────────────────────────── */
function GridCard({ log }: { log: any }) {
  return (
    <div
      className="card overflow-hidden group relative"
    >
      {/* Thumbnail */}
      <div className="aspect-square relative overflow-hidden" style={{ background: 'var(--bg)' }}>
        {log.image_url ? (
          <img
            src={log.image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image size={28} style={{ color: 'var(--border)' }} />
          </div>
        )}
        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }}
        >
          <p className="text-white text-xs line-clamp-3 leading-relaxed">{log.caption || '—'}</p>
        </div>
        {/* Status badge top-right */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={log.status} />
        </div>
        {/* External link top-left */}
        {log.ig_permalink && (
          <a
            href={log.ig_permalink}
            target="_blank"
            rel="noreferrer"
            className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-xs line-clamp-1 mb-1" style={{ color: 'var(--text-primary)' }}>
          {log.caption || <span style={{ color: 'var(--text-muted)' }}>No caption</span>}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateLabel(log)}</span>
          {log.topic_used && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              {log.topic_used}
            </span>
          )}
        </div>
        {log.status === 'failed' && log.error_message && (
          <p className="text-[10px] mt-1.5 line-clamp-2" style={{ color: '#ef4444' }}>
            {friendlyPostError(log.error_message)}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── List row ──────────────────────────────────────── */
function ListRow({ log }: { log: any }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Thumbnail */}
      <div
        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        {log.image_url
          ? <img src={log.image_url} alt="" className="w-full h-full object-cover" />
          : <Image size={16} style={{ color: 'var(--border)' }} />
        }
      </div>

      {/* Caption + error */}
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>
          {log.caption || <span style={{ color: 'var(--text-muted)' }}>No caption</span>}
        </p>
        {log.status === 'failed' && log.error_message && (
          <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>
            {friendlyPostError(log.error_message)}
          </p>
        )}
      </div>

      {/* Topic */}
      <div className="w-28 shrink-0 hidden md:block">
        {log.topic_used
          ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.topic_used}</span>
          : <span style={{ color: 'var(--border)' }}>—</span>
        }
      </div>

      {/* Status */}
      <div className="w-24 shrink-0">
        <StatusBadge status={log.status} />
      </div>

      {/* Date */}
      <div className="w-32 shrink-0">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dateLabel(log)}</span>
      </div>

      {/* Link */}
      <div className="w-8 shrink-0 flex justify-center">
        {log.ig_permalink ? (
          <a
            href={log.ig_permalink}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <ExternalLink size={13} />
          </a>
        ) : <span />}
      </div>
    </div>
  )
}

/* ── Main client component ─────────────────────────── */
export default function PostsClient({ logs: allLogs }: { logs: any[] }) {
  const [activeStatus, setActiveStatus] = useState<Status>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = activeStatus === 'all'
    ? allLogs
    : allLogs.filter(l => l.status === activeStatus)

  const countFor = (s: Status) => s === 'all' ? allLogs.length : allLogs.filter(l => l.status === s).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-heading">Your <em>posts</em></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Every post PostPilot has created or attempted
          </p>
        </div>

        {/* View toggle */}
        <div
          className="card flex items-center p-1 gap-0.5"
        >
          <button
            onClick={() => setViewMode('grid')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = countFor(tab.value)
          if (tab.value !== 'all' && count === 0) return null
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeStatus === tab.value ? 'var(--accent)' : 'var(--bg-card)',
                color: activeStatus === tab.value ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${activeStatus === tab.value ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {tab.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: activeStatus === tab.value ? 'rgba(255,255,255,0.2)' : 'var(--bg)',
                  color: activeStatus === tab.value ? '#fff' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div
          className="card p-6 text-center"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Image size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {activeStatus === 'all'
              ? 'Set up a schedule and PostPilot will publish content automatically.'
              : `No ${activeStatus} posts to show.`}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(log => <GridCard key={log.id} log={log} />)}
        </div>
      ) : (
        <div
          className="card overflow-hidden overflow-x-auto"
        >
          {/* List header */}
          <div
            className="flex items-center gap-4 px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
          >
            <div className="w-12 shrink-0" />
            <div className="flex-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Caption</div>
            <div className="w-28 shrink-0 hidden md:block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Topic</div>
            <div className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</div>
            <div className="w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</div>
            <div className="w-8 shrink-0" />
          </div>
          {filtered.map(log => <ListRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
