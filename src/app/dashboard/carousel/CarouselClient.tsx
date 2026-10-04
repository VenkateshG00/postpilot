'use client'

import { useState } from 'react'
import {
 Layers, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles,
 Loader2, Send, Clock, RefreshCw, GripVertical,
 CheckCircle2, Wand2, MoveUp, MoveDown,
} from 'lucide-react'

interface Acct { id: string; account_name: string }

interface Slide {
 id: string
 image_url: string
 caption: string
}

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

let slideIdCounter = 0
function newSlideId() { return `slide_${++slideIdCounter}_${Date.now()}` }

export default function CarouselClient({
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
 const [slideCount, setSlideCount] = useState(5)
 const [credits, setCredits] = useState(initialCredits)
 const [gen, setGen] = useState(false)
 const [genSlideImg, setGenSlideImg] = useState<string | null>(null)
 const [posting, setPosting] = useState(false)
 const [posted, setPosted] = useState<'now' | 'scheduled' | null>(null)
 const [scheduledFor, setScheduledFor] = useState('')
 const [error, setError] = useState('')

 const [slides, setSlides] = useState<Slide[]>([])
 const [activeSlideIdx, setActiveSlideIdx] = useState(0)
 const [mainCaption, setMainCaption] = useState('')

 const activeSlide = slides[activeSlideIdx] ?? null
 const maxSlides = 10

 async function generateCarousel() {
 const text = brief.trim()
 if (!text) { setError('Describe what the carousel should be about'); return }
 if (!accountId) { setError('Select an Instagram account first'); return }
 setError(''); setPosted(null); setGen(true)
 try {
 const res = await fetch('/api/posts/custom/generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 brief: `Create a ${slideCount}-slide Instagram carousel about: ${text}. For each slide, write a short headline (max 15 words).`,
 }),
 })
 const data = await res.json()
 if (!res.ok) throw new Error(data.error || 'Failed')

 const captionLines = (data.caption || '').split('\n').filter((l: string) => l.trim())
 const newSlides: Slide[] = Array.from({ length: slideCount }, (_, i) => ({
 id: newSlideId(),
 image_url: '',
 caption: captionLines[i] || `Slide ${i + 1}`,
 }))

 setSlides(newSlides)
 setMainCaption(data.caption || '')
 setActiveSlideIdx(0)
 if (typeof data.credits_left === 'number') setCredits(data.credits_left)

 // Generate unique AI images for each slide in parallel
 await Promise.all(newSlides.map(async (slide) => {
   try {
     const imgRes = await fetch('/api/posts/generate-image', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ brief: slide.caption }),
     })
     const imgData = await imgRes.json()
     if (imgRes.ok && imgData.image_url) {
       setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, image_url: imgData.image_url } : s))
       if (typeof imgData.credits_left === 'number') setCredits(imgData.credits_left)
     }
   } catch { /* best-effort per slide */ }
 }))
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : 'Generation failed')
 } finally {
 setGen(false)
 }
 }

 async function generateSlideImage(slideId: string) {
 const slide = slides.find(s => s.id === slideId)
 if (!slide) return
 setGenSlideImg(slideId); setError('')
 try {
 const res = await fetch('/api/posts/generate-image', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ brief: slide.caption }),
 })
 const data = await res.json()
 if (!res.ok) throw new Error(data.error || 'Failed')
 setSlides(prev => prev.map(s => s.id === slideId ? { ...s, image_url: data.image_url } : s))
 if (typeof data.credits_left === 'number') setCredits(data.credits_left)
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : 'AI image generation failed')
 } finally {
 setGenSlideImg(null)
 }
 }

 function addSlide() {
 if (slides.length >= maxSlides) return
 const newSlide: Slide = { id: newSlideId(), image_url: '', caption: `Slide ${slides.length + 1}` }
 setSlides([...slides, newSlide])
 setActiveSlideIdx(slides.length)
 }

 function removeSlide(idx: number) {
 if (slides.length <= 2) return
 const next = slides.filter((_, i) => i !== idx)
 setSlides(next)
 setActiveSlideIdx(Math.min(activeSlideIdx, next.length - 1))
 }

 function moveSlide(idx: number, dir: -1 | 1) {
 const target = idx + dir
 if (target < 0 || target >= slides.length) return
 const copy = [...slides]
 ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
 setSlides(copy)
 setActiveSlideIdx(target)
 }

 function updateSlide(idx: number, field: 'caption' | 'image_url', value: string) {
 setSlides(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
 }

 async function publish(scheduleAt?: string) {
 if (slides.length < 2 || !accountId) return
 setPosting(true); setError('')
 try {
 const res = await fetch('/api/posts/custom/publish', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 account_id: accountId,
 caption: mainCaption,
 image_url: slides[0]?.image_url || '',
 content_type: 'carousel',
 carousel_slides: slides.map(s => ({ image_url: s.image_url, caption: s.caption })),
 scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
 }),
 })
 const data = await res.json()
 if (!res.ok) throw new Error(data.error || 'Failed')
 setPosted(data.scheduled ? 'scheduled' : 'now')
 setSlides([]); setBrief(''); setMainCaption(''); setScheduledFor('')
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : 'Publish failed')
 } finally {
 setPosting(false)
 }
 }

 return (
 <div>
 {/* Header */}
 <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
 <div>
 <h1 className="page-heading">
 Carousel <em>builder</em>
 </h1>
 <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
 Create multi-slide carousel posts for maximum engagement
 </p>
 </div>
 <span
 className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
 style={{ background: 'rgba(255,77,77,0.1)', color: 'var(--accent)' }}
 >
 {credits} credits
 </span>
 </div>

 {/* Banners */}
 {posted && (
 <div className="rounded-2xl p-4 mb-5 flex items-center gap-2"
 style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
 <CheckCircle2 size={16} color="#22c55e" />
 <span className="text-sm font-medium" style={{ color: '#22c55e' }}>
 {posted === 'scheduled' ? 'Carousel scheduled!' : 'Carousel sent — it will appear on your account shortly.'}
 </span>
 </div>
 )}
 {error && (
 <div className="rounded-2xl p-3 mb-5 text-sm"
 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
 {error}
 </div>
 )}

 {/* Generate form */}
 {slides.length === 0 && (
 <div className="card p-6 space-y-4">
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
 What should this carousel be about?
 </label>
 <textarea
 value={brief}
 onChange={e => setBrief(e.target.value)}
 rows={3}
 placeholder="e.g. 5 tips for healthy skin · Step-by-step recipe · Before and after transformation"
 style={{ ...inputStyle, resize: 'none' }}
 />
 </div>

 <div>
 <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
 Number of slides
 </label>
 <div className="flex items-center gap-3">
 <input
 type="range"
 min={2}
 max={maxSlides}
 value={slideCount}
 onChange={e => setSlideCount(parseInt(e.target.value))}
 className="flex-1"
 style={{ accentColor: 'var(--accent)' }}
 />
 <span className="text-sm font-bold w-8 text-center" style={{ color: 'var(--text-primary)' }}>
 {slideCount}
 </span>
 </div>
 </div>

 <button
 onClick={generateCarousel}
 disabled={gen || !accountId}
 className="btn-primary w-full flex items-center justify-center gap-2"
 >
 {gen
 ? <><Loader2 size={16} className="animate-spin" /> Generating carousel…</>
 : <><Sparkles size={16} /> Generate carousel</>}
 </button>
 </div>
 )}

 {/* Carousel editor */}
 {slides.length > 0 && (
 <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

 {/* Left: Slide list + editor (3 cols) */}
 <div className="lg:col-span-3 space-y-4">

 {/* Slide strip */}
 <div className="card p-6">
 <div className="flex items-center justify-between mb-3">
 <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
 <Layers size={14} className="inline mr-1.5" />
 Slides ({slides.length}/{maxSlides})
 </p>
 <button
 onClick={addSlide}
 disabled={slides.length >= maxSlides}
 className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-80"
 style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
 >
 <Plus size={12} /> Add slide
 </button>
 </div>

 <div className="flex gap-2 overflow-x-auto pb-2">
 {slides.map((slide, idx) => (
 <button
 key={slide.id}
 onClick={() => setActiveSlideIdx(idx)}
 className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all"
 style={{
 outline: activeSlideIdx === idx ? '2px solid var(--accent)' : '1px solid var(--border)',
 outlineOffset: activeSlideIdx === idx ? 2 : 0,
 }}
 >
 {slide.image_url ? (
 <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
 <Layers size={16} style={{ color: 'var(--border)' }} />
 </div>
 )}
 <span
 className="absolute bottom-0.5 right-1 text-[9px] font-bold px-1 rounded"
 style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
 >
 {idx + 1}
 </span>
 {(genSlideImg === slide.id || (gen && !slide.image_url)) && (
 <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
 <Loader2 size={16} className="animate-spin text-white" />
 </div>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Active slide editor */}
 {activeSlide && (
 <div className="card p-6 space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
 Slide {activeSlideIdx + 1}
 </p>
 <div className="flex items-center gap-1">
 <button
 onClick={() => moveSlide(activeSlideIdx, -1)}
 disabled={activeSlideIdx === 0}
 className="w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 transition-opacity hover:opacity-70"
 style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
 title="Move up"
 >
 <MoveUp size={13} />
 </button>
 <button
 onClick={() => moveSlide(activeSlideIdx, 1)}
 disabled={activeSlideIdx === slides.length - 1}
 className="w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 transition-opacity hover:opacity-70"
 style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
 title="Move down"
 >
 <MoveDown size={13} />
 </button>
 <button
 onClick={() => removeSlide(activeSlideIdx)}
 disabled={slides.length <= 2}
 className="w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 transition-opacity hover:opacity-70"
 style={{ border: '1px solid var(--border)', color: '#ef4444' }}
 title="Remove slide"
 >
 <Trash2 size={13} />
 </button>
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Slide text</label>
 <input
 value={activeSlide.caption}
 onChange={e => updateSlide(activeSlideIdx, 'caption', e.target.value)}
 style={inputStyle}
 placeholder="Slide headline or text"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Image URL</label>
 <input
 value={activeSlide.image_url}
 onChange={e => updateSlide(activeSlideIdx, 'image_url', e.target.value)}
 style={inputStyle}
 placeholder="https://..."
 />
 </div>

 {aiImageProvider !== 'none' && (
 <button
 onClick={() => generateSlideImage(activeSlide.id)}
 disabled={!!genSlideImg || credits < aiImageCredits}
 className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
 style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
 >
 {genSlideImg === activeSlide.id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
 Generate AI image for this slide
 <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({aiImageCredits} credits)</span>
 </button>
 )}
 </div>
 )}

 {/* Main caption + actions */}
 <div className="card p-6 space-y-4">
 <div>
 <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
 Main caption (appears below the carousel)
 </label>
 <textarea
 value={mainCaption}
 onChange={e => setMainCaption(e.target.value)}
 rows={4}
 style={{ ...inputStyle, resize: 'vertical' }}
 />
 </div>

 <div className="flex gap-2 flex-col sm:flex-row">
 <button
 onClick={generateCarousel}
 disabled={gen}
 className="btn-secondary flex items-center justify-center gap-2"
 >
 <RefreshCw size={14} /> Regenerate
 </button>
 <button
 onClick={() => publish()}
 disabled={posting || slides.length < 2}
 className="btn-primary flex-1 flex items-center justify-center gap-2"
 >
 {posting ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : <><Send size={14} /> Post carousel</>}
 </button>
 </div>

 {/* Schedule */}
 <div className="flex items-center gap-2 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
 <Clock size={14} style={{ color: 'var(--text-muted)' }} />
 <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>or schedule</span>
 <input
 type="datetime-local"
 value={scheduledFor}
 onChange={e => setScheduledFor(e.target.value)}
 className="flex-1 text-sm"
 style={inputStyle}
 />
 <button
 onClick={() => publish(scheduledFor)}
 disabled={posting || !scheduledFor || slides.length < 2}
 className="btn-secondary flex items-center gap-2 whitespace-nowrap"
 >
 Schedule
 </button>
 </div>
 </div>
 </div>

 {/* Right: Live preview (2 cols) */}
 <div className="lg:col-span-2">
 <div className="sticky top-6">
 <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
 Carousel Preview
 </p>

 {/* Phone-like preview */}
 <div className="card overflow-hidden" style={{ maxWidth: 320, margin: '0 auto' }}>
 {/* Image area with slide nav */}
 <div className="relative aspect-square">
 {activeSlide?.image_url ? (
 <img src={activeSlide.image_url} alt="" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
 <Layers size={32} style={{ color: 'var(--border)' }} />
 </div>
 )}

 {/* Slide text overlay */}
 {activeSlide?.caption && (
 <div className="absolute bottom-0 inset-x-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
 <p className="text-sm font-bold text-white drop-shadow-lg leading-snug">
 {activeSlide.caption}
 </p>
 </div>
 )}

 {/* Slide counter */}
 <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
 style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
 {activeSlideIdx + 1}/{slides.length}
 </span>

 {/* Nav arrows */}
 {activeSlideIdx > 0 && (
 <button
 onClick={() => setActiveSlideIdx(i => i - 1)}
 className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
 style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
 >
 <ChevronLeft size={16} />
 </button>
 )}
 {activeSlideIdx < slides.length - 1 && (
 <button
 onClick={() => setActiveSlideIdx(i => i + 1)}
 className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
 style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
 >
 <ChevronRight size={16} />
 </button>
 )}
 </div>

 {/* Dots */}
 <div className="flex items-center justify-center gap-1.5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
 {slides.map((_, i) => (
 <button
 key={i}
 onClick={() => setActiveSlideIdx(i)}
 className="w-1.5 h-1.5 rounded-full transition-all"
 style={{
 background: i === activeSlideIdx ? 'var(--accent)' : 'var(--border)',
 width: i === activeSlideIdx ? 12 : 6,
 }}
 />
 ))}
 </div>

 {/* Caption preview */}
 {mainCaption && (
 <div className="px-4 pb-4">
 <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-primary)' }}>
 <span className="font-bold mr-1">
 @{accounts.find(a => a.id === accountId)?.account_name || 'youraccount'}
 </span>
 {mainCaption.slice(0, 120)}
 {mainCaption.length > 120 && <span style={{ color: 'var(--text-muted)' }}>... more</span>}
 </p>
 </div>
 )}
 </div>

 {/* Specs */}
 <div className="mt-3 text-center">
 <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
 1080 × 1080px · Square 1:1 · Up to 10 slides
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
