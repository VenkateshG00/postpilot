'use client'

import { useState } from 'react'
import { Check, RefreshCw, Trash2, Loader2 } from 'lucide-react'

interface Post { id: string; image_url: string; caption: string; topic_used: string; created_at: string; account_name: string }

export default function ApprovalsClient({ posts: initial, credits: initialCredits }: { posts: Post[]; credits: number }) {
  const [posts, setPosts] = useState(initial)
  const [credits, setCredits] = useState(initialCredits)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function act(id: string, action: 'approve' | 'regenerate' | 'discard') {
    setBusy(id + action); setError('')
    try {
      const res = await fetch('/api/posts/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_log_id: id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (action === 'regenerate') {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, caption: data.caption, image_url: data.image_url } : p))
        if (typeof data.credits_left === 'number') setCredits(data.credits_left)
      } else {
        setPosts(prev => prev.filter(p => p.id !== id))
      }
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Posts waiting for your review before they publish.</p>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">{credits} credits</span>
      </div>

      {error && <div className="card p-3 mb-5 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      {posts.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-gray-400 text-sm">Nothing waiting for approval. New posts appear here when an account has approval turned on.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">@{p.account_name} · {p.topic_used}</span>
              </div>
              <div className="flex gap-4">
                {p.image_url
                  ? <img src={p.image_url} alt="" className="w-28 h-28 rounded-xl object-cover bg-gray-100 shrink-0" />
                  : <div className="w-28 h-28 rounded-xl bg-gray-100 shrink-0" />}
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{p.caption}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => act(p.id, 'approve')} disabled={!!busy}
                  className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {busy === p.id + 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve &amp; publish
                </button>
                <button onClick={() => act(p.id, 'regenerate')} disabled={!!busy}
                  className="btn-secondary justify-center disabled:opacity-50">
                  {busy === p.id + 'regenerate' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Regenerate (1)
                </button>
                <button onClick={() => act(p.id, 'discard')} disabled={!!busy}
                  className="btn-secondary justify-center text-red-600 disabled:opacity-50" title="Discard">
                  {busy === p.id + 'discard' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
