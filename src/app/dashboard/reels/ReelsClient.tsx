'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Film, BookImage, Sparkles, Loader2, RefreshCw, Send, Clock,
  Type, AlignLeft, AlignCenter, AlignRight, Palette, Wand2,
  ImagePlus, CheckCircle2, ChevronDown,
} from 'lucide-react'

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }

type ContentMode = 'reel' | 'story'
type TextAlign = 'left' | 'center' | 'right'

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

const OVERLAY_COLORS = [
  '#ffffff', '#000000', '#ff4d4d', '#3b82f6', '#22c55e',
  '#eab308', '#a855f7', '#ec4899', '#f97316',
]

const TEMPLATES = [
  { id: 'minimal', label: 'Minimal', gradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)' },
  { id: 'warm', label: 'Warm', gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff4d4d 100%)' },
  { id: 'ocean', label: 'Ocean', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'midnight', label: 'Midnight', gradient: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)' },
]

export default function ReelsClient({
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
  const [mode, setMode] = useState<ContentMode>('reel')
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

  /* Overlay settings */
  const [overlayText, setOverlayText] = useState('')
  const [textAlign, setTextAlign] = useState<TextAlign>('center')
  const [textColor, setTextColor] = useState('#ffffff')
  const [selectedTemplate, setSelectedTemplate] = useState('minimal')
  const [showTemplates, setShowTemplates] = useState(false)

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0]

  async function generate() {
    const text = brief.trim()
    if (!text) { setError('Describe what your ' + mode + ' should be about'); return }
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
      setOverlayText(data.caption?.split('\n')[0]?.slice(0, 60) || '')
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
          content_type: mode,
          overlay_text: overlayText || undefined,
          scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPosted(data.scheduled ? 'scheduled' : 'now')
      setPreview(null); setBrief(''); setScheduledFor(''); setOverlayText('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Reels & Stories
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create eye-catching vertical content for Instagram
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
              ? `${mode === 'reel' ? 'Reel' : 'Story'} scheduled successfully!`
              : `${mode === 'reel' ? 'Reel' : 'Story'} sent — it will appear on your account shortly.`}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* ── Left: Controls (3 cols) ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Content type toggle */}
          <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
            <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              Content Type
            </label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setMode('reel')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: mode === 'reel' ? 'var(--accent)' : 'var(--bg)',
                  color: mode === 'reel' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <Film size={15} /> Reel
              </button>
              <button
                onClick={() => setMode('story')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: mode === 'story' ? 'var(--accent)' : 'var(--bg)',
                  color: mode === 'story' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <BookImage size={15} /> Story
              </button>
            </div>

            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              {mode === 'reel'
                ? 'Reels appear in the Reels tab and are discoverable via Explore. 9:16 vertical.'
                : 'Stories disappear after 24 hours. Great for daily engagement. 9:16 vertical.'}
            </p>
          </div>

          {/* Account + Brief */}
          <div className="rounded-2xl p-4 sm:p-5 space-y-4" style={cardStyle}>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Instagram account
              </label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                What should this {mode} be about?
              </label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                rows={3}
                placeholder={mode === 'reel'
                  ? 'e.g. Tips for healthy eating · Behind-the-scenes of our shop · Customer testimonial'
                  : 'e.g. Flash sale announcement · Daily motivation · Quick product showcase'}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            <button
              onClick={generate}
              disabled={gen || !accountId}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--accent)' }}
            >
              {gen
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><Sparkles size={16} /> Generate {mode}</>}
            </button>
          </div>

          {/* Text overlay editor */}
          {preview && (
            <div className="rounded-2xl p-4 sm:p-5 space-y-4" style={cardStyle}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <Type size={14} className="inline mr-1.5" />
                Text Overlay
              </h3>

              <input
                value={overlayText}
                onChange={e => setOverlayText(e.target.value)}
                placeholder="Add text overlay (optional)"
                maxLength={80}
                style={inputStyle}
              />

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Align:</span>
                  {(['left', 'center', 'right'] as TextAlign[]).map(a => {
                    const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
                    return (
                      <button
                        key={a}
                        onClick={() => setTextAlign(a)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{
                          background: textAlign === a ? 'var(--accent)' : 'var(--bg)',
                          color: textAlign === a ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <Icon size={14} />
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <Palette size={12} style={{ color: 'var(--text-muted)' }} />
                  {OVERLAY_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: c,
                        border: textColor === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                        transform: textColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Background template picker */}
              <div>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  <ChevronDown size={12} className={showTemplates ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  Background Templates
                </button>
                {showTemplates && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className="rounded-xl h-16 transition-all"
                        style={{
                          background: t.gradient,
                          outline: selectedTemplate === t.id ? '2px solid var(--accent)' : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        <span className="text-[10px] font-semibold text-white drop-shadow-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Caption + actions */}
          {preview && (
            <div className="rounded-2xl p-4 sm:p-5 space-y-4" style={cardStyle}>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Caption</label>
                <textarea
                  value={preview.caption}
                  onChange={e => setPreview(p => p ? { ...p, caption: e.target.value } : p)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* AI image button */}
              {aiImageProvider !== 'none' && (
                <button
                  onClick={generateAIImage}
                  disabled={genImg || credits < aiImageCredits}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {genImg ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  Generate AI image
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({aiImageCredits} credits)</span>
                </button>
              )}

              {/* Action row */}
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={generate}
                  disabled={gen || genImg}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <RefreshCw size={14} /> Regenerate
                </button>
                <button
                  onClick={() => publish()}
                  disabled={posting || genImg}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--accent)' }}
                >
                  {posting ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : <><Send size={14} /> Post now</>}
                </button>
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-2 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
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

        {/* ── Right: Live Preview (2 cols) ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              {mode === 'reel' ? 'Reel' : 'Story'} Preview (9:16)
            </p>
            <div
              className="relative rounded-2xl overflow-hidden mx-auto"
              style={{
                width: '100%',
                maxWidth: 280,
                aspectRatio: '9/16',
                background: preview?.image_url ? undefined : activeTemplate.gradient,
                border: '1px solid var(--border)',
              }}
            >
              {/* Background image or template gradient */}
              {preview?.image_url && (
                <img src={preview.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}

              {/* Overlay gradient for text readability */}
              {(preview?.image_url || overlayText) && (
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6) 100%)' }}
                />
              )}

              {/* Text overlay */}
              {overlayText && (
                <div
                  className="absolute inset-x-4 bottom-16 text-lg font-bold leading-tight drop-shadow-lg"
                  style={{ color: textColor, textAlign }}
                >
                  {overlayText}
                </div>
              )}

              {/* Mode label */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                {mode === 'reel' ? <Film size={10} /> : <BookImage size={10} />}
                {mode === 'reel' ? 'REEL' : 'STORY'}
              </div>

              {/* Fake IG UI overlay */}
              <div className="absolute bottom-0 inset-x-0 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  <span className="text-[11px] font-semibold text-white">
                    @{accounts.find(a => a.id === accountId)?.account_name || 'youraccount'}
                  </span>
                </div>
              </div>

              {/* Empty state */}
              {!preview && !overlayText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                  {mode === 'reel' ? <Film size={32} className="text-white/30" /> : <BookImage size={32} className="text-white/30" />}
                  <p className="text-xs text-white/40">
                    Generate a {mode} to see the preview
                  </p>
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="mt-3 text-center">
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                1080 × 1920px · Vertical 9:16 · {mode === 'reel' ? 'Up to 90s' : '15s'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
