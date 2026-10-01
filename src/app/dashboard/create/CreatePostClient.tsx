'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper, ImagePlus, Wand2 } from 'lucide-react'
import { upcomingFestivals, whenLabel, type Festival } from '@/lib/festivals'

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }

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

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

export default function CreatePostClient({
  accounts,
  credits: initialCredits,
  aiImageProvider,
  aiImageCredits,
}: {
  accounts: Acct[]
  credits: number
  aiImageProvider: string
  aiImageCredits: number
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [brief, setBrief] = useState('')
  const [credits, setCredits] = useState(initialCredits)
  const [gen, setGen] = useState(false)
  const [genImg, setGenImg] = useState(false)
  const [posting, setPosting] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [posted, setPosted] = useState<'now' | 'scheduled' | null>(null)
  const [scheduledFor, setScheduledFor] = useState('')
  const [error, setError] = useState('')

  const upcoming = useMemo(() => upcomingFestivals(45, 8), [])

  async function generate(briefText?: string) {
    const text = (briefText ?? brief).trim()
    if (!text) { setError('Tell us what the post is about'); return }
    setError(''); setPosted(null); setGen(true)
    try {
      const res = await fetch('/api/posts/custom/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPreview({ caption: data.caption, image_url: data.image_url, topic: data.topic })
      if (typeof data.credits_left === 'number') setCredits(data.credits_left)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGen(false)
    }
  }

  async function generateAIImage() {
    if (!preview) return
    setError(''); setGenImg(true)
    try {
      const res = await fetch('/api/posts/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: preview.topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPreview(p => p ? { ...p, image_url: data.image_url } : p)
      if (typeof data.credits_left === 'number') setCredits(data.credits_left)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI image generation failed')
    } finally {
      setGenImg(false)
    }
  }

  function pickFestival(f: Festival) {
    if (!accountId) { setError('Connect an Instagram account first'); return }
    setBrief(f.greeting)
    generate(f.greeting)
  }

  async function publish(scheduleAt?: string) {
    if (!preview || !accountId) return
    setPosting(true); setError('')
    try {
      const res = await fetch('/api/posts/custom/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          caption: preview.caption,
          image_url: preview.image_url,
          topic: preview.topic,
          scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPosted(data.scheduled ? 'scheduled' : 'now')
      setPreview(null); setBrief(''); setScheduledFor('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create a post</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Write a one-off post — a festival wish, an offer, an announcement.
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
          style={{ background: 'rgba(255,77,77,0.1)', color: 'var(--accent)' }}
        >
          {credits} credits
        </span>
      </div>

      {/* Success banner */}
      {posted && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={16} color="#22c55e" />
          <span className="text-sm font-medium" style={{ color: '#22c55e' }}>
            {posted === 'scheduled'
              ? 'Scheduled — it will publish automatically at the chosen time.'
              : 'Post sent — it will appear on your account shortly.'}
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl p-3 mb-5 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Festivals */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 mb-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <PartyPopper size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Upcoming festivals &amp; occasions</p>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            One click drafts a greeting post you can edit, post now, or schedule.
          </p>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((f) => (
              <button
                key={f.date + f.name}
                onClick={() => pickFestival(f)}
                disabled={gen || !accountId}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid var(--accent)'
                  e.currentTarget.style.background = 'rgba(255,77,77,0.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid var(--border)'
                  e.currentTarget.style.background = 'var(--bg)'
                }}
              >
                <span aria-hidden>{f.emoji}</span>
                <span className="font-medium">{f.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{whenLabel(f.date)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main form */}
      <div className="rounded-2xl p-4 sm:p-5 space-y-4" style={cardStyle}>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Instagram account
          </label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            What should this post be about?
          </label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings · Free health camp this Sunday"
            style={{ ...inputStyle, resize: 'none' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Generating a post costs 1 credit (Pexels stock photo included).
          </p>
        </div>
        <button
          onClick={() => generate()}
          disabled={gen || !accountId}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--accent)' }}
        >
          {gen
            ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
            : <><Sparkles size={16} /> Generate post</>}
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl p-4 sm:p-5 mt-5 space-y-4" style={cardStyle}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Preview</p>

          {/* Image area */}
          <div className="relative">
            {preview.image_url ? (
              <img src={preview.image_url} alt="" className="w-full max-w-sm rounded-xl object-cover" />
            ) : (
              <div
                className="w-full max-w-sm h-48 rounded-xl flex items-center justify-center text-sm"
                style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
              >
                No image
              </div>
            )}

            {/* AI image button */}
            {!genImg && aiImageProvider !== 'none' && (
              <button
                onClick={generateAIImage}
                disabled={genImg || credits < aiImageCredits}
                title={credits < aiImageCredits ? `Need at least ${aiImageCredits} credits for AI image` : 'Generate a unique AI image'}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <Wand2 size={13} />
                AI image
                <span style={{ color: 'var(--text-muted)' }}>({aiImageCredits} credits)</span>
              </button>
            )}
            {genImg && (
              <div className="absolute inset-0 max-w-sm rounded-xl flex flex-col items-center justify-center gap-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', color: 'var(--text-muted)' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span>Generating AI image…</span>
                <span className="text-xs" style={{ opacity: 0.6 }}>usually 5–20 s</span>
              </div>
            )}
          </div>

          {/* AI image tip */}
          {aiImageProvider !== 'none' && (
            <p className="text-xs -mt-1" style={{ color: 'var(--text-muted)' }}>
              <ImagePlus size={11} className="inline mr-1" />
              Tap <span className="font-medium">"AI image"</span> to replace the stock photo with a unique, AI-generated image.
            </p>
          )}

          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{preview.caption}</p>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={() => generate()}
              disabled={gen || genImg}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Regenerate <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(1 credit)</span>
            </button>
            <button
              onClick={() => publish()}
              disabled={posting || genImg}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--accent)' }}
            >
              {posting
                ? <><Loader2 size={16} className="animate-spin" /> Posting…</>
                : <><Send size={16} /> Post now</>}
            </button>
          </div>

          {/* Schedule row */}
          <div
            className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 flex-wrap"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>or schedule for</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="flex-1 text-sm"
              style={inputStyle}
            />
            <button
              onClick={() => publish(scheduledFor)}
              disabled={posting || !scheduledFor || genImg}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-50 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
