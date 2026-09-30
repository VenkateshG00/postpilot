'use client'

import { useState } from 'react'
import { Check, RefreshCw, Trash2, Loader2, ClipboardCheck } from 'lucide-react'

interface Post {
  id: string
  image_url: string
  caption: string
  topic_used: string
  created_at: string
  account_name: string
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

export default function ApprovalsClient({
  posts: initial,
  credits: initialCredits,
}: {
  posts: Post[]
  credits: number
}) {
  const [posts, setPosts] = useState(initial)
  const [credits, setCredits] = useState(initialCredits)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function act(id: string, action: 'approve' | 'regenerate' | 'discard') {
    setBusy(id + action)
    setError('')
    try {
      const res = await fetch('/api/posts/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_log_id: id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (action === 'regenerate') {
        setPosts(prev => prev.map(p =>
          p.id === id ? { ...p, caption: data.caption, image_url: data.image_url } : p
        ))
        if (typeof data.credits_left === 'number') setCredits(data.credits_left)
      } else {
        setPosts(prev => prev.filter(p => p.id !== id))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Approvals</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Posts waiting for your review before they publish.
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
          style={{ background: 'rgba(255,77,77,0.1)', color: 'var(--accent)' }}
        >
          {credits} credits
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-2xl p-3 mb-5 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={cardStyle}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <ClipboardCheck size={22} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nothing waiting for approval</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            New posts appear here when an account has approval turned on.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => (
            <div key={p.id} className="rounded-2xl p-5" style={cardStyle}>
              {/* Meta */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  @{p.account_name} · {p.topic_used}
                </span>
              </div>

              {/* Content */}
              <div className="flex gap-4">
                {p.image_url
                  ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-28 h-28 rounded-xl object-cover shrink-0"
                      style={{ background: 'var(--bg)' }}
                    />
                  )
                  : (
                    <div
                      className="w-28 h-28 rounded-xl shrink-0"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    />
                  )
                }
                <p className="text-sm whitespace-pre-wrap line-clamp-6" style={{ color: 'var(--text-primary)' }}>
                  {p.caption}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => act(p.id, 'approve')}
                  disabled={!!busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--accent)' }}
                >
                  {busy === p.id + 'approve'
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Check size={16} />
                  }
                  Approve &amp; publish
                </button>
                <button
                  onClick={() => act(p.id, 'regenerate')}
                  disabled={!!busy}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {busy === p.id + 'regenerate'
                    ? <Loader2 size={16} className="animate-spin" />
                    : <RefreshCw size={16} />
                  }
                  Regenerate (1)
                </button>
                <button
                  onClick={() => act(p.id, 'discard')}
                  disabled={!!busy}
                  title="Discard"
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl disabled:opacity-50 hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                >
                  {busy === p.id + 'discard'
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
