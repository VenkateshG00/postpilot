"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import {
  Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper,
  ImagePlus, Upload, X, Image, Film, CircleDot, Hash, ArrowUpRight,
  Zap, Type, Heart, MessageCircle, Bookmark, MoreHorizontal, Share2,
  Smile, Save, TrendingUp, ChevronDown, ChevronUp
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { upcomingFestivals, whenLabel, type Festival } from "@/lib/festivals"
import { useToast } from "@/components/ui/Toast"

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }
interface GeneratedCaption {
  caption: string
  hashtags: { tag: string; relevance: number }[]
  tones: { label: string; score: number }[]
  generations_used: number
  generations_limit: number
}

type ContentTab = "post" | "reel" | "story"

const TAB_CONFIG: { value: ContentTab; label: string; icon: typeof Image; title: string; desc: string; accept: string; formats: string; dropLabel: string }[] = [
  { value: "post",  label: "Post",  icon: Image,     title: "Create post",  desc: "Upload an image or use AI to create your post.",     accept: "image/*",            formats: "JPG, PNG, WebP",        dropLabel: "image" },
  { value: "reel",  label: "Reel",  icon: Film,      title: "Create reel",  desc: "Upload a video or use AI to create your reel.",      accept: "image/*,video/*",     formats: "MP4, MOV · or image",   dropLabel: "video" },
  { value: "story", label: "Story", icon: CircleDot,  title: "Create story", desc: "Upload an image or video for your story.",            accept: "image/*,video/*",     formats: "JPG, PNG, MP4, MOV",    dropLabel: "image or video" },
]

/* ─── Emoji data ─── */
const EMOJI_CATS = [
  { name: "Popular", emojis: ["🔥","❤️","✨","💯","🎉","👏","🙌","💪","👍","😍","🤩","😂","🥰","😎","💎","⭐"] },
  { name: "Social", emojis: ["📸","🎬","🎨","💡","🏆","🎯","📱","🎵","📌","✅","💰","🛍️","📢","🎤","🚀","💬"] },
  { name: "Nature", emojis: ["🌸","🌺","🌻","🌈","☀️","🌙","⚡","🍃","🌿","🦋","🌊","🏔️","🌅","🍀","🌹","🐾"] },
  { name: "Food", emojis: ["☕","🍕","🎂","🍷","🥗","🍩","🧁","🍔","🥤","🍦","🌶️","🍣","🥑","🫖","🧋","🍹"] },
]

/* ─── Best posting times (IST general) ─── */
const BEST_TIMES = [
  { h: 11, label: "11:00 AM", quality: "peak" as const,  reason: "Lunch break scroll" },
  { h: 13, label: "1:00 PM",  quality: "good" as const,  reason: "Post-lunch browse" },
  { h: 17, label: "5:00 PM",  quality: "peak" as const,  reason: "After work / school" },
  { h: 19, label: "7:00 PM",  quality: "peak" as const,  reason: "Prime-time feed" },
  { h: 21, label: "9:00 PM",  quality: "good" as const,  reason: "Night scrolling" },
]

/* ─── Aspect ratios ─── */
const RATIOS = [
  { label: "1:1", css: "1/1", desc: "Square" },
  { label: "4:5", css: "4/5", desc: "Portrait" },
  { label: "16:9", css: "16/9", desc: "Landscape" },
]

/* ─── Style helpers ─── */
function toneColor(score: number): string {
  if (score >= 90) return "#22c55e"
  if (score >= 80) return "#3b82f6"
  if (score >= 70) return "#f59e0b"
  return "#94a3b8"
}
function hashColor(relevance: number): string {
  if (relevance >= 90) return "rgba(34,197,94,0.15)"
  if (relevance >= 80) return "rgba(59,130,246,0.15)"
  if (relevance >= 70) return "rgba(245,158,11,0.15)"
  return "rgba(148,163,184,0.15)"
}
function hashTextColor(relevance: number): string {
  if (relevance >= 90) return "#16a34a"
  if (relevance >= 80) return "#2563eb"
  if (relevance >= 70) return "#d97706"
  return "#64748b"
}
function qualityDot(q: "peak" | "good") {
  return q === "peak" ? "#22c55e" : "#3b82f6"
}

/* Glass card */
const glass: React.CSSProperties = {
  background: "color-mix(in srgb, var(--bg-card, #fff) 82%, transparent)",
  backdropFilter: "blur(20px) saturate(1.3)",
  WebkitBackdropFilter: "blur(20px) saturate(1.3)",
  border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: 20,
}
const glassInner: React.CSSProperties = {
  background: "color-mix(in srgb, var(--bg) 90%, transparent)",
  border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
  borderRadius: 14,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 14,
  fontSize: 14,
  outline: "none",
  background: "color-mix(in srgb, var(--bg) 85%, transparent)",
  border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
  color: "var(--text-primary)",
  transition: "border-color 0.2s, box-shadow 0.2s",
}

/* ─────────────────────── Component ─────────────────────── */
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
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<ContentTab>("post")
  const [accountId, setAccountId] = useState(accounts[0]?.id || "")
  const [brief, setBrief] = useState("")
  const [credits, setCredits] = useState(initialCredits)
  const [gen, setGen] = useState(false)
  const [genImg, setGenImg] = useState(false)
  const [genCap, setGenCap] = useState(false)
  const [posting, setPosting] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [posted, setPosted] = useState<"now" | "scheduled" | null>(null)
  const [scheduledFor, setScheduledFor] = useState("")
  const [error, setError] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState("")
  const [mode, setMode] = useState<"upload" | "ai">("upload")
  const [angle, setAngle] = useState("")
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatedCaption, setGeneratedCaption] = useState<GeneratedCaption | null>(null)
  const [captionLimitError, setCaptionLimitError] = useState<{ message: string; generations_used: number; generations_limit: number; reset_date: string } | null>(null)
  const [selectedTone, setSelectedTone] = useState<string | null>(null)

  /* ── New state ── */
  const [showEmoji, setShowEmoji] = useState(false)
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [expandCaption, setExpandCaption] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showBestTimes, setShowBestTimes] = useState(false)

  const captionRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  /* ── Prefill from draft URL params ── */
  const searchParams = useSearchParams()
  useEffect(() => {
    const draftCaption = searchParams.get("caption")
    const draftImage = searchParams.get("image_url")
    const draftAccount = searchParams.get("account_id")
    const draftType = searchParams.get("type") as ContentTab | null
    if (draftCaption || draftImage) {
      if (draftAccount) setAccountId(draftAccount)
      if (draftType && ["post","reel","story"].includes(draftType)) setActiveTab(draftType)
      if (draftCaption) setCaption(draftCaption)
      if (draftImage) {
        setPreview({ caption: draftCaption || "", image_url: draftImage, topic: searchParams.get("topic") || "" })
        setMode("ai")
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upcoming = useMemo(() => upcomingFestivals(45, 8), [])
  const tabConfig = TAB_CONFIG.find(t => t.value === activeTab)!

  /* Step indicator */
  const currentStep = !uploadedFile && !preview ? 1 : (!preview && !caption && !generatedCaption) ? 2 : 3
  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Autogenerate" },
    { num: 3, label: "Schedule or post" },
  ]

  /* ── Auto-resize textarea ── */
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.max(el.scrollHeight, 80) + "px"
  }, [])

  useEffect(() => {
    if (captionRef.current) autoResize(captionRef.current)
  }, [caption, autoResize])

  /* ── Close emoji on click outside ── */
  useEffect(() => {
    if (!showEmoji) return
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showEmoji])

  /* ── Insert emoji at cursor ── */
  function insertEmoji(emoji: string) {
    const el = captionRef.current
    if (el) {
      const start = el.selectionStart ?? caption.length
      const end = el.selectionEnd ?? caption.length
      const next = caption.slice(0, start) + emoji + caption.slice(end)
      setCaption(next)
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + emoji.length; el.focus() }, 0)
    } else {
      setCaption(c => c + emoji)
    }
  }

  /* ── File handling ── */
  function handleFile(file: File) {
    const isVideo = file.type.startsWith("video/")
    const isImage = file.type.startsWith("image/")
    if (!isImage && !isVideo) { setError("Please upload an image or video file"); return }
    if (activeTab === "post" && isVideo) { setError("Posts only support images. Switch to Reel for video."); return }
    if (activeTab === "reel" && !isVideo && !isImage) { setError("Please upload a video for reels"); return }
    setUploadedFile(file)
    setUploadPreview(URL.createObjectURL(file))
    setUploadedUrl(null)
    setError("")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clearUpload() {
    setUploadedFile(null)
    if (uploadPreview) URL.revokeObjectURL(uploadPreview)
    setUploadPreview(null)
    setUploadedUrl(null)
    setGeneratedCaption(null)
    setCaptionLimitError(null)
    setAngle("")
  }

  async function uploadMedia(file: File): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload/media", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Upload failed")
    return data.url
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  /* ── Generate caption from uploaded media ── */
  async function generateCaption(toneOverride?: string) {
    if (!uploadedFile) return
    setGeneratingCaption(true); setError(""); setCaptionLimitError(null)
    try {
      let base64Data: string | undefined
      const isImage = uploadedFile.type.startsWith("image/")
      if (isImage) {
        if (uploadedFile.size > 4 * 1024 * 1024) { setError("Image too large for AI analysis (max 4MB). Use a smaller image."); setGeneratingCaption(false); return }
        try { base64Data = await fileToBase64(uploadedFile) } catch { setError("Could not read image file"); setGeneratingCaption(false); return }
      }
      const res = await fetch("/api/posts/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Data, angle: angle.trim() || undefined, content_type: activeTab, tone: toneOverride || undefined }),
      })
      const data = await res.json()
      if (res.status === 429 && data.error === "caption_limit_reached") {
        setCaptionLimitError({ message: data.message, generations_used: data.generations_used, generations_limit: data.generations_limit, reset_date: data.reset_date })
        return
      }
      if (!res.ok) throw new Error(data.error || "Failed")
      setGeneratedCaption({ caption: data.caption, hashtags: data.hashtags, tones: data.tones, generations_used: data.generations_used, generations_limit: data.generations_limit })
      setCaption(data.caption)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Caption generation failed") }
    finally { setGeneratingCaption(false) }
  }

  /* ── AI generation ── */
  async function generate(briefText?: string) {
    const text = (briefText ?? brief).trim()
    if (!text) { setError("Tell us what the post is about"); return }
    setError(""); setPosted(null); setGen(true)
    try {
      const res = await fetch("/api/posts/custom/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPreview({ caption: data.caption, image_url: data.image_url, topic: data.topic })
      setCaption(data.caption)
      if (typeof data.credits_left === "number") setCredits(data.credits_left)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Generation failed") }
    finally { setGen(false) }
  }

  async function generateAIImage() {
    if (!preview) return
    setError(""); setGenImg(true)
    try {
      const res = await fetch("/api/posts/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: preview.topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPreview(p => p ? { ...p, image_url: data.image_url } : p)
      if (typeof data.credits_left === "number") setCredits(data.credits_left)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "AI image generation failed") }
    finally { setGenImg(false) }
  }

  async function regenerateCaption() {
    if (!preview) return
    const text = brief.trim() || preview.topic || "update"
    setError(""); setGenCap(true)
    try {
      const res = await fetch("/api/posts/custom/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPreview(p => p ? { ...p, caption: data.caption, topic: data.topic } : p)
      setCaption(data.caption)
      if (typeof data.credits_left === "number") setCredits(data.credits_left)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Caption regeneration failed") }
    finally { setGenCap(false) }
  }

  function pickFestival(f: Festival) {
    if (!accountId) { setError("Connect an Instagram account first"); return }
    setBrief(f.greeting); setMode("ai"); generate(f.greeting)
  }

  /* ── Publish ── */
  async function publish(scheduleAt?: string) {
    if (!accountId) return
    setPosting(true); setError("")
    try {
      let mediaUrl = uploadedUrl || preview?.image_url || null
      if (uploadedFile && !uploadedUrl) {
        setUploading(true)
        try { mediaUrl = await uploadMedia(uploadedFile); setUploadedUrl(mediaUrl) }
        finally { setUploading(false) }
      }
      let fullCaption = caption || preview?.caption || ""
      if (generatedCaption && generatedCaption.hashtags.length > 0 && !fullCaption.includes("#")) {
        fullCaption = `${fullCaption}\n\n${generatedCaption.hashtags.map(h => h.tag).join(" ")}`
      }
      if (!mediaUrl && !fullCaption) { setError("Add media or generate content first"); setPosting(false); return }
      const res = await fetch("/api/posts/custom/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId, caption: fullCaption, image_url: mediaUrl,
          topic: preview?.topic || brief || angle || "manual upload",
          content_type: activeTab,
          scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPosted(data.scheduled ? "scheduled" : "now")
      const typeLabel = activeTab === "reel" ? "Reel" : activeTab === "story" ? "Story" : "Post"
      addToast(data.scheduled ? `${typeLabel} scheduled successfully!` : `${typeLabel} sent! It will appear on your account shortly.`, "success", 5000)
      setPreview(null); setBrief(""); setScheduledFor(""); setCaption("")
      setGeneratedCaption(null); setCaptionLimitError(null); setAngle("")
      clearUpload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed")
      addToast(e instanceof Error ? e.message : "Publish failed", "error", 6000)
    } finally { setPosting(false) }
  }

  /* ── Save as draft ── */
  async function saveDraft() {
    if (!accountId) return
    setSavingDraft(true); setError("")
    try {
      let mediaUrl = uploadedUrl || preview?.image_url || null
      if (uploadedFile && !uploadedUrl) {
        setUploading(true)
        try { mediaUrl = await uploadMedia(uploadedFile); setUploadedUrl(mediaUrl) }
        finally { setUploading(false) }
      }
      let fullCaption = caption || preview?.caption || ""
      if (generatedCaption && generatedCaption.hashtags.length > 0 && !fullCaption.includes("#")) {
        fullCaption = `${fullCaption}\n\n${generatedCaption.hashtags.map(h => h.tag).join(" ")}`
      }
      const res = await fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId, caption: fullCaption, image_url: mediaUrl,
          topic: preview?.topic || brief || angle || "draft",
          content_type: activeTab,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save draft")
      addToast("Draft saved! Find it in your posts.", "success", 3000)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save draft") }
    finally { setSavingDraft(false) }
  }

  /* ── Best time click → fill schedule ── */
  function pickBestTime(hour: number) {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0)
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
    const pad = (n: number) => String(n).padStart(2, "0")
    setScheduledFor(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setShowBestTimes(false)
  }

  /* ── Account name ── */
  const acctName = accounts.find(a => a.id === accountId)?.account_name || "account"
  const previewCaption = caption || preview?.caption || ""
  const hasContent = uploadedFile || preview || caption

  /* ── Shared: caption editor block (reusable for both modes) ── */
  const captionEditor = (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
          {generatedCaption || preview ? "Edit caption" : "Caption"}
        </label>
        <span className="text-xs tabular-nums" style={{ color: caption.length > 2200 ? "#ef4444" : "var(--text-muted)" }}>
          {caption.length} / 2,200
        </span>
      </div>
      <div className="relative">
        <textarea
          ref={captionRef}
          value={caption}
          onChange={e => { setCaption(e.target.value); if (preview) setPreview(p => p ? { ...p, caption: e.target.value } : p); autoResize(e.target) }}
          placeholder={`Write your ${activeTab} caption here...`}
          className="w-full text-sm transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
          style={{ ...inputStyle, minHeight: 80, resize: "none", paddingRight: 44, lineHeight: "1.7" }}
        />
        {/* Emoji toggle */}
        <div ref={emojiRef} className="absolute bottom-2 right-2">
          <button
            onClick={() => setShowEmoji(s => !s)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: showEmoji ? "var(--accent)" : "color-mix(in srgb, var(--border) 40%, transparent)", color: showEmoji ? "#fff" : "var(--text-muted)" }}
            type="button"
          >
            <Smile size={16} />
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 right-0 z-50 p-3" style={{ ...glass, width: 300, maxHeight: 280, overflowY: "auto" }}>
              {EMOJI_CATS.map(cat => (
                <div key={cat.name} className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{cat.name}</p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map(e => (
                      <button key={e} onClick={() => insertEmoji(e)} type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-[var(--bg)] hover:scale-110 transition-all">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ── Shared: schedule + best times block ── */
  const scheduleBlock = (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 40%, transparent)" }}>
        <div className="flex items-center gap-1.5">
          <Clock size={14} style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Schedule for</span>
        </div>
        <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)}
          className="flex-1 text-sm" style={{ ...inputStyle, borderRadius: 12 }} />
        <button onClick={() => publish(scheduledFor)} disabled={posting || uploading || !scheduledFor || (!uploadedFile && !caption && !preview)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-40"
          style={{ ...glassInner, borderRadius: 12, color: "var(--text-primary)" }}>
          Schedule
        </button>
      </div>

      {/* Best times */}
      <div>
        <button onClick={() => setShowBestTimes(b => !b)} type="button"
          className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80"
          style={{ color: "var(--accent)" }}>
          <TrendingUp size={12} />
          Best times to post
          {showBestTimes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showBestTimes && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BEST_TIMES.map(t => (
              <button key={t.h} onClick={() => pickBestTime(t.h)} type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03]"
                style={{ ...glassInner, padding: "6px 12px" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: qualityDot(t.quality) }} />
                {t.label}
                <span className="hidden sm:inline" style={{ color: "var(--text-muted)", fontSize: 10 }}>· {t.reason}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  /* ── Shared: action buttons (Post + Draft) ── */
  function actionButtons(disabled: boolean) {
    return (
      <div className="flex gap-2">
        <button onClick={() => publish()} disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, #e040fb) 100%)",
            color: "#fff", borderRadius: 14,
            boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)",
          }}>
          {posting ? <><Loader2 size={16} className="animate-spin" /> {uploading ? "Uploading..." : "Posting..."}</> : <><Send size={16} /> {activeTab === "reel" ? "Post reel" : activeTab === "story" ? "Post story" : "Post now"}</>}
        </button>
        <button onClick={saveDraft} disabled={savingDraft || (!uploadedFile && !caption && !preview)} type="button"
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all disabled:opacity-40"
          style={{ ...glassInner, borderRadius: 14, color: "var(--text-primary)" }}>
          {savingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span className="hidden sm:inline">Draft</span>
        </button>
      </div>
    )
  }

  /* ═══════════ Instagram Mockup Preview (reusable) ═══════════ */
  const igPreview = (preview || (mode === "upload" && (uploadedFile || uploadPreview))) ? (
    <div>
      <div style={{
        ...glass,
        overflow: "hidden",
        padding: 0,
      }}>
        {/* IG Header */}
        <div className="flex items-center justify-between px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              padding: 2, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div className="flex items-center justify-center text-[10px] font-bold" style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "var(--bg-card, #fff)", color: "var(--accent)",
              }}>
                {acctName[0].toUpperCase()}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{acctName}</p>
              <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>Original post</p>
            </div>
          </div>
          <MoreHorizontal size={16} style={{ color: "var(--text-muted)" }} />
        </div>

        {/* IG Image */}
        <div className="relative" style={{ background: "#111" }}>
          {(preview?.image_url || uploadPreview) ? (
            uploadPreview && !preview?.image_url ? (
              uploadedFile?.type.startsWith("video/") ? (
                <video src={uploadPreview} className="w-full object-cover" style={{ display: "block", aspectRatio: aspectRatio === "4:5" ? "4/5" : aspectRatio === "16:9" ? "16/9" : "1/1" }} muted />
              ) : (
                <img src={uploadPreview} alt="" className="w-full object-cover" style={{ display: "block", aspectRatio: aspectRatio === "4:5" ? "4/5" : aspectRatio === "16:9" ? "16/9" : "1/1" }} />
              )
            ) : (
              <img src={preview!.image_url} alt="" className="w-full object-cover" style={{ display: "block", aspectRatio: aspectRatio === "4:5" ? "4/5" : aspectRatio === "16:9" ? "16/9" : "1/1" }} />
            )
          ) : (
            <div className="w-full flex items-center justify-center" style={{ background: "var(--bg)", aspectRatio: "1/1" }}>
              <div className="text-center" style={{ color: "var(--text-muted)" }}>
                <ImagePlus size={36} className="mx-auto mb-2" style={{ opacity: 0.25 }} />
                <p className="text-xs font-medium">No image yet</p>
              </div>
            </div>
          )}
          {genImg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "#fff" }} />
              <span className="text-xs font-medium" style={{ color: "#fff" }}>Generating image...</span>
            </div>
          )}
        </div>

        {/* IG Action Icons */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-3.5">
            <Heart size={20} style={{ color: "var(--text-primary)" }} />
            <MessageCircle size={20} style={{ color: "var(--text-primary)", transform: "scaleX(-1)" }} />
            <Share2 size={18} style={{ color: "var(--text-primary)" }} />
          </div>
          <Bookmark size={20} style={{ color: "var(--text-primary)" }} />
        </div>

        {/* IG Caption — FULL with expand/collapse */}
        <div className="px-3.5 pb-3.5">
          <div className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            <span className="font-semibold mr-1">{acctName}</span>
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {expandCaption
                ? previewCaption || "Your caption will appear here..."
                : (previewCaption || "Your caption will appear here...").slice(0, 100) + (previewCaption.length > 100 ? "" : "")}
              {!expandCaption && previewCaption.length > 100 && "..."}
            </span>
          </div>
          {/* Hashtags shown when expanded */}
          {expandCaption && generatedCaption?.hashtags && generatedCaption.hashtags.length > 0 && !previewCaption.includes("#") && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#3b82f6" }}>
              {generatedCaption.hashtags.map(h => h.tag).join("  ")}
            </p>
          )}
          {previewCaption.length > 100 && (
            <button onClick={() => setExpandCaption(e => !e)} type="button"
              className="text-[11px] font-medium mt-0.5 block" style={{ color: "var(--text-muted)" }}>
              {expandCaption ? "less" : "more"}
            </button>
          )}
          <p className="text-[10px] mt-2 uppercase tracking-wide" style={{ color: "var(--text-muted)", opacity: 0.5 }}>Just now</p>
        </div>
      </div>
      {/* Aspect ratio selector */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {RATIOS.map(r => (
          <button key={r.label} onClick={() => setAspectRatio(r.label)} type="button"
            className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: aspectRatio === r.label ? "var(--accent)" : "color-mix(in srgb, var(--bg) 80%, transparent)",
              color: aspectRatio === r.label ? "#fff" : "var(--text-muted)",
              border: aspectRatio === r.label ? "none" : "1px solid color-mix(in srgb, var(--border) 40%, transparent)",
            }}>
            {r.label}
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] mt-2 font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)", opacity: 0.35 }}>
        Preview
      </p>
    </div>
  ) : null

  /* ═══════════ JSX ═══════════ */
  return (
    <div style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-brand) 3%, var(--bg)) 0%, var(--bg) 40%, color-mix(in srgb, var(--accent) 2%, var(--bg)) 100%)", minHeight: "100%" }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">{tabConfig.title.split(" ")[0]} <em>{tabConfig.title.split(" ")[1]}</em></h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tabConfig.desc}</p>
        </div>
        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(255,77,77,0.12) 0%, rgba(255,77,77,0.06) 100%)",
            color: "var(--accent)",
            border: "1px solid rgba(255,77,77,0.15)",
          }}>
          {credits} credits
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ ...glassInner }}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.value
          return (
            <button key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPreview(null); setError(""); setCaption(""); setGeneratedCaption(null); setCaptionLimitError(null); setAngle(""); clearUpload() }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, #e040fb) 100%)" : "transparent",
                color: active ? "#fff" : "var(--text-muted)",
                boxShadow: active ? "0 2px 12px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
              }}>
              <Icon size={14} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                style={{
                  background: currentStep >= step.num
                    ? "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, #e040fb) 100%)"
                    : "color-mix(in srgb, var(--bg) 80%, transparent)",
                  color: currentStep >= step.num ? "#fff" : "var(--text-muted)",
                  border: currentStep >= step.num ? "none" : "1px solid var(--border)",
                  boxShadow: currentStep >= step.num ? "0 2px 8px color-mix(in srgb, var(--accent) 20%, transparent)" : "none",
                }}>
                {currentStep > step.num ? "✓" : step.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: currentStep >= step.num ? "var(--text-primary)" : "var(--text-muted)" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px transition-all" style={{ background: currentStep > step.num ? "var(--accent)" : "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Success banner */}
      {posted && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle2 size={16} color="#22c55e" />
          <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
            {posted === "scheduled"
              ? `${activeTab === "reel" ? "Reel" : activeTab === "story" ? "Story" : "Post"} scheduled — it will publish automatically at the chosen time.`
              : `${activeTab === "reel" ? "Reel" : activeTab === "story" ? "Story" : "Post"} sent — it will appear on your account shortly.`}
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl p-3 mb-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode("upload")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            ...(mode === "upload" ? glass : {}),
            background: mode === "upload" ? glass.background : "transparent",
            color: mode === "upload" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "upload" ? glass.border : "1px solid transparent",
            boxShadow: mode === "upload" ? "0 2px 12px rgba(0,0,0,0.04)" : "none",
          }}>
          <Upload size={14} /> Upload media
        </button>
        <button onClick={() => setMode("ai")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            ...(mode === "ai" ? glass : {}),
            background: mode === "ai" ? glass.background : "transparent",
            color: mode === "ai" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "ai" ? glass.border : "1px solid transparent",
            boxShadow: mode === "ai" ? "0 2px 12px rgba(0,0,0,0.04)" : "none",
          }}>
          <Sparkles size={14} /> AI generate
        </button>
      </div>

      {/* ═══════════ SPLIT LAYOUT ═══════════ */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── LEFT COLUMN: Form ── */}
        <div className="w-full lg:flex-1 min-w-0 space-y-5">

          {/* ═══ Upload mode ═══ */}
          {mode === "upload" && (
            <div style={{ ...glass, padding: "18px 20px" }} className="space-y-4">
              {/* Account */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>Instagram account</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
                </select>
              </div>

              {/* Drag and drop */}
              {!uploadedFile ? (
                <div className="relative rounded-2xl p-8 text-center cursor-pointer transition-all"
                  style={{
                    border: isDragging ? "2px dashed var(--accent)" : "2px dashed color-mix(in srgb, var(--border) 60%, transparent)",
                    background: isDragging ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "color-mix(in srgb, var(--bg) 60%, transparent)",
                  }}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept={tabConfig.accept} className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                    <Upload size={24} style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Drop your {tabConfig.dropLabel} here</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>or click to browse · {tabConfig.formats}</p>
                </div>
              ) : (
                <div className="relative">
                  {uploadedFile.type.startsWith("video/") ? (
                    <video src={uploadPreview!} controls className="w-full rounded-2xl" style={{ maxHeight: 260 }} />
                  ) : (
                    <img src={uploadPreview!} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 260 }} />
                  )}
                  <button onClick={clearUpload}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)" }}>
                    <X size={14} />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 text-sm"
                      style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", color: "var(--text-muted)" }}>
                      <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /><span>Uploading...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Generate caption section (upload mode — no caption yet) */}
              {uploadedFile && !generatedCaption && !captionLimitError && (
                <div className="rounded-2xl p-4 space-y-3" style={{ ...glassInner }}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                      <Zap size={14} style={{ color: "var(--accent)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Caption</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Describe the angle, or just hit Generate.</p>
                    </div>
                  </div>
                  <input type="text" value={angle} onChange={e => setAngle(e.target.value)}
                    placeholder="e.g. motivational, behind the scenes..."
                    style={inputStyle} />
                  <button onClick={() => generateCaption()} disabled={generatingCaption || !uploadedFile}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, #e040fb) 100%)",
                      color: "#fff", borderRadius: 14,
                      boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 25%, transparent)",
                    }}>
                    {generatingCaption ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate caption</>}
                  </button>
                </div>
              )}

              {/* Caption limit */}
              {captionLimitError && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="flex items-start gap-2">
                    <Zap size={14} className="shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#d97706" }}>Caption limit reached</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{captionLimitError.generations_limit} / month on Free</p>
                    </div>
                  </div>
                  <a href="/dashboard/billing" className="btn-primary w-full flex items-center justify-center gap-2 text-sm" style={{ textDecoration: "none" }}>
                    <ArrowUpRight size={16} /> Upgrade to Pro
                  </a>
                  <button onClick={() => setCaptionLimitError(null)} className="w-full text-center text-xs py-1" style={{ color: "var(--text-muted)" }}>Maybe later</button>
                </div>
              )}

              {/* Generated caption result (tones, hashtags, regenerate) */}
              {generatedCaption && (
                <div className="space-y-4">
                  {/* Tone chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {generatedCaption.tones.map((tone, i) => (
                      <button key={i} onClick={() => { setSelectedTone(tone.label); generateCaption(tone.label) }}
                        disabled={generatingCaption}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: selectedTone === tone.label ? toneColor(tone.score) : `${toneColor(tone.score)}15`,
                          color: selectedTone === tone.label ? "#fff" : toneColor(tone.score),
                          border: selectedTone === tone.label ? `2px solid ${toneColor(tone.score)}` : "2px solid transparent",
                        }}>
                        {tone.label} {tone.score}%
                      </button>
                    ))}
                  </div>

                  {/* Caption editor */}
                  {captionEditor}

                  {/* Hashtags */}
                  {generatedCaption.hashtags.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                        <Hash size={11} className="inline mr-1" />Hashtags
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedCaption.hashtags.map((h, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: hashColor(h.relevance), color: hashTextColor(h.relevance) }}>
                            {h.tag} <span className="text-[9px] opacity-70">{h.relevance}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{generatedCaption.generations_used} / {generatedCaption.generations_limit} captions used</p>
                    <button onClick={() => { setSelectedTone(null); generateCaption() }} disabled={generatingCaption}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ ...glassInner, borderRadius: 10, color: "var(--text-primary)" }}>
                      {generatingCaption ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerate
                    </button>
                  </div>
                </div>
              )}

              {/* Manual caption (when no AI caption generated yet) */}
              {!generatedCaption && captionEditor}

              {/* Action buttons */}
              {actionButtons(posting || uploading || (!uploadedFile && !caption))}

              {/* Schedule */}
              {scheduleBlock}
            </div>
          )}

          {/* ═══ AI mode ═══ */}
          {mode === "ai" && (
            <div className="space-y-4">
              {/* Festivals */}
              {upcoming.length > 0 && (
                <div style={{ ...glass, padding: "16px 20px" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <PartyPopper size={14} style={{ color: "var(--accent)" }} />
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Upcoming festivals</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>· tap to draft</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {upcoming.map(f => (
                      <button key={f.date + f.name} onClick={() => pickFestival(f)} disabled={gen || !accountId}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all disabled:opacity-50 hover:scale-[1.02]"
                        style={{ ...glassInner, padding: "6px 12px", color: "var(--text-primary)" }}>
                        <span aria-hidden>{f.emoji}</span><span className="font-medium">{f.name}</span>
                        <span style={{ color: "var(--text-muted)" }}>{whenLabel(f.date)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI form */}
              <div style={{ ...glass, padding: "18px 20px" }} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>Instagram account</label>
                  <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                    {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>What should this {activeTab} be about?</label>
                  <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3}
                    placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings"
                    style={{ ...inputStyle, resize: "none", lineHeight: "1.7" }} />
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>1 credit per generation. AI image costs extra.</p>
                </div>
                <button onClick={() => generate()} disabled={gen || !accountId}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, #e040fb) 100%)",
                    color: "#fff", borderRadius: 14,
                    boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}>
                  {gen ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate {activeTab}</>}
                </button>
              </div>

              {/* AI Edit Controls */}
              {preview && (
                <div style={{ ...glass, padding: "18px 20px" }} className="space-y-3">
                  {captionEditor}

                  <div className="flex gap-2">
                    <button onClick={regenerateCaption} disabled={genCap || gen || genImg}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer"
                      style={{ ...glassInner, borderRadius: 12, color: "var(--text-primary)", padding: "10px 12px" }}>
                      {genCap ? <Loader2 size={14} className="animate-spin" /> : <Type size={14} />}
                      New caption <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>1 cr</span>
                    </button>
                    {aiImageProvider !== "none" && (
                      <button onClick={generateAIImage} disabled={genImg || gen || genCap || credits < aiImageCredits}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer"
                        style={{ ...glassInner, borderRadius: 12, color: "var(--text-primary)", padding: "10px 12px" }}>
                        {genImg ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                        AI image <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>{aiImageCredits} cr</span>
                      </button>
                    )}
                  </div>

                  {actionButtons(posting || genImg || genCap)}
                  {scheduleBlock}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Live Instagram Preview (sticky) ── */}
        {igPreview && (
          <div className="w-full lg:w-[360px] lg:shrink-0 lg:sticky lg:top-4">
            {igPreview}
          </div>
        )}
      </div>
    </div>
  )
}
