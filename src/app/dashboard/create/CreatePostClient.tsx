'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2 } from 'lucide-react'

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }

export default function CreatePostClient({ accounts, credits: initialCredits }: { accounts: Acct[]; credits: number }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [brief, setBrief] = useState('')
  const [credits, setCredits] = useState(initialCredits)
  const [gen, setGen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!brief.trim()) { setError('Tell us what the post is about'); return }
    setError(''); setPosted(false); setGen(true)
    try {
      const res = await fetch('/api/posts/custom/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPreview({ caption: data.caption, image_url: data.image_url, topic: data.topic })
      if (typeof data.credits_left === 'number') setCredits(data.credits_left)
    } catch (e: any) { setError(e.message) } finally { setGen(false) }
  }

  async function postNow() {
    if (!preview || !accountId) return
    setPosting(true); setError('')
    try {
      const res = await fetch('/api/posts/custom/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, caption: preview.caption, image_url: preview.image_url, topic: preview.topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPosted(true); setPreview(null); setBrief('')
    } catch (e: any) { setError(e.message) } finally { setPosting(false) }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create a post</h1>
          <p className="text-sm text-gray-500 mt-1">Write a one-off post — a festival wish, an offer, an announcement.</p>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">{credits} credits</span>
      </div>

      {posted && (
        <div className="card p-4 mb-5 flex items-center gap-2 text-emerald-700 bg-emerald-50 border-emerald-100">
          <CheckCircle2 size={16} /> Post sent — it will appear on your account shortly.
        </div>
      )}
      {error && <div className="card p-3 mb-5 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Instagram account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-base">
            {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">What should this post be about?</label>
          <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3}
            placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings · Free health camp this Sunday"
            className="input-base" />
          <p className="text-xs text-gray-400 mt-1">Generating a post uses 1 credit.</p>
        </div>
        <button onClick={generate} disabled={gen || !accountId}
          className="btn-primary w-full justify-center disabled:opacity-50">
          {gen ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Sparkles size={16} /> Generate post</>}
        </button>
      </div>

      {preview && (
        <div className="card p-5 mt-5 space-y-4">
          <p className="text-sm font-medium text-gray-900">Preview</p>
          {preview.image_url && <img src={preview.image_url} alt="" className="w-full max-w-sm rounded-xl object-cover" />}
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview.caption}</p>
          <div className="flex gap-2">
            <button onClick={generate} disabled={gen}
              className="btn-secondary justify-center disabled:opacity-50">
              {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Regenerate (1 credit)
            </button>
            <button onClick={postNow} disabled={posting}
              className="btn-primary flex-1 justify-center disabled:opacity-50">
              {posting ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : <><Send size={16} /> Post now</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
