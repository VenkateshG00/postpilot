'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper, ImagePlus, Wand2 } from 'lucide-react'
import { upcomingFestivals, whenLabel, type Festival } from '@/lib/festivals'

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }

export default function CreatePostClient({
  accounts,
  credits: initialCredits,
  aiImageProvider,
  aiImageCredits,
}: {
  accounts: Acct[]
  credits: number
  aiImageProvider: string  // 'none' | 'replicate_flux' | future providers
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create a post</h1>
          <p className="text-sm text-gray-500 mt-1">Write a one-off post — a festival wish, an offer, an announcement.</p>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
          {credits} credits
        </span>
      </div>

      {posted && (
        <div className="card p-4 mb-5 flex items-center gap-2 text-emerald-700 bg-emerald-50 border-emerald-100">
          <CheckCircle2 size={16} />
          {posted === 'scheduled'
            ? 'Scheduled — it will publish automatically at the chosen time.'
            : 'Post sent — it will appear on your account shortly.'}
        </div>
      )}
      {error && <div className="card p-3 mb-5 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      {upcoming.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <PartyPopper size={16} className="text-brand-600" />
            <p className="text-sm font-medium text-gray-900">Upcoming festivals &amp; occasions</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            One click drafts a greeting post you can edit, post now, or schedule.
          </p>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((f) => (
              <button
                key={f.date + f.name}
                onClick={() => pickFestival(f)}
                disabled={gen || !accountId}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-sm text-gray-700 transition-colors disabled:opacity-50"
              >
                <span aria-hidden>{f.emoji}</span>
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-gray-400">{whenLabel(f.date)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Instagram account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-base">
            {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">What should this post be about?</label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings · Free health camp this Sunday"
            className="input-base"
          />
          <p className="text-xs text-gray-400 mt-1">Generating a post costs 1 credit (Pexels stock photo included).</p>
        </div>
        <button
          onClick={() => generate()}
          disabled={gen || !accountId}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {gen
            ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
            : <><Sparkles size={16} /> Generate post</>}
        </button>
      </div>

      {preview && (
        <div className="card p-5 mt-5 space-y-4">
          <p className="text-sm font-medium text-gray-900">Preview</p>

          {/* Image area */}
          <div className="relative">
            {preview.image_url ? (
              <img
                src={preview.image_url}
                alt=""
                className="w-full max-w-sm rounded-xl object-cover"
              />
            ) : (
              <div className="w-full max-w-sm h-48 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}

            {/* AI Image overlay button */}
            {!genImg && aiImageProvider !== 'none' && (
              <button
                onClick={generateAIImage}
                disabled={genImg || credits < aiImageCredits}
                title={credits < aiImageCredits ? `Need at least ${aiImageCredits} credits for AI image` : 'Generate a unique AI image for this post'}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm text-xs font-medium text-gray-700 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wand2 size={13} />
                AI image
                <span className="text-gray-400">({aiImageCredits} credits)</span>
              </button>
            )}
            {genImg && (
              <div className="absolute inset-0 max-w-sm rounded-xl bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 size={20} className="animate-spin text-brand-600" />
                <span>Generating AI image…</span>
                <span className="text-xs text-gray-400">usually 5–20 s</span>
              </div>
            )}
          </div>

          {/* AI image tip */}
          {aiImageProvider !== 'none' && (
            <p className="text-xs text-gray-400 -mt-1">
            <ImagePlus size={11} className="inline mr-1" />
            Tap <span className="font-medium text-gray-500">"AI image"</span> to replace the stock photo with a unique, AI-generated image — stock photos can appear on anyone's feed; AI images are yours alone.
          </p>
          )}

          <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview.caption}</p>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={() => generate()}
              disabled={gen || genImg}
              className="btn-secondary justify-center disabled:opacity-50"
            >
              {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Regenerate <span className="text-gray-400 text-xs">(1 credit)</span>
            </button>
            <button
              onClick={() => publish()}
              disabled={posting || genImg}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {posting
                ? <><Loader2 size={16} className="animate-spin" /> Posting…</>
                : <><Send size={16} /> Post now</>}
            </button>
          </div>

          {/* Schedule row */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 whitespace-nowrap">or schedule for</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="input-base flex-1 text-sm"
            />
            <button
              onClick={() => publish(scheduledFor)}
              disabled={posting || !scheduledFor || genImg}
              className="btn-secondary whitespace-nowrap disabled:opacity-50"
            >
              Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
