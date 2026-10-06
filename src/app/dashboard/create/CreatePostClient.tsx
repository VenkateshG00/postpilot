"use client"

import { useMemo, useState, useRef, useCallback } from "react"
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper, ImagePlus, Wand2, Upload, X, Image, Film, CircleDot, Hash, ArrowUpRight, Zap, Type, Heart, MessageCircle, Bookmark, MoreHorizontal, Share2 } from "lucide-react"
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

/* Tone indicator color based on score */
function toneColor(score: number): string {
  if (score >= 90) return "#22c55e"
  if (score >= 80) return "#3b82f6"
  if (score >= 70) return "#f59e0b"
  return "#94a3b8"
}

/* Hashtag relevance color */
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
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
  // Media upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Caption editing
  const [caption, setCaption] = useState("")
  const [mode, setMode] = useState<"upload" | "ai">("upload")
  // Generate caption state (for upload mode)
  const [angle, setAngle] = useState("")
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatedCaption, setGeneratedCaption] = useState<GeneratedCaption | null>(null)
  const [captionLimitError, setCaptionLimitError] = useState<{ message: string; generations_used: number; generations_limit: number; reset_date: string } | null>(null)
  const [selectedTone, setSelectedTone] = useState<string | null>(null)

  const upcoming = useMemo(() => upcomingFestivals(45, 8), [])
  const tabConfig = TAB_CONFIG.find(t => t.value === activeTab)!

  /* -- Step indicator -- */
  const currentStep = !uploadedFile && !preview ? 1 : (!preview && !caption && !generatedCaption) ? 2 : 3
  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Autogenerate" },
    { num: 3, label: "Schedule or post" },
  ]

  /* -- File handling -- */
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

  /* -- Upload file to Supabase via API -- */
  async function uploadMedia(file: File): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload/media", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Upload failed")
    return data.url
  }

  /* -- Convert file to base64 in browser -- */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  /* -- Generate caption from uploaded media -- */
  async function generateCaption(toneOverride?: string) {
    if (!uploadedFile) return
    setGeneratingCaption(true); setError(""); setCaptionLimitError(null)

    try {
      // Convert file to base64 in browser — no Supabase upload needed for caption gen
      let base64Data: string | undefined
      const isImage = uploadedFile.type.startsWith("image/")
      if (isImage) {
        if (uploadedFile.size > 4 * 1024 * 1024) {
          setError("Image too large for AI analysis (max 4MB). Use a smaller image.")
          setGeneratingCaption(false)
          return
        }
        try {
          base64Data = await fileToBase64(uploadedFile)
        } catch {
          setError("Could not read image file")
          setGeneratingCaption(false)
          return
        }
      }

      const res = await fetch("/api/posts/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: base64Data,
          angle: angle.trim() || undefined,
          content_type: activeTab,
          tone: toneOverride || undefined,
        }),
      })
      const data = await res.json()

      if (res.status === 429 && data.error === "caption_limit_reached") {
        setCaptionLimitError({
          message: data.message,
          generations_used: data.generations_used,
          generations_limit: data.generations_limit,
          reset_date: data.reset_date,
        })
        return
      }

      if (!res.ok) throw new Error(data.error || "Failed")

      setGeneratedCaption({
        caption: data.caption,
        hashtags: data.hashtags,
        tones: data.tones,
        generations_used: data.generations_used,
        generations_limit: data.generations_limit,
      })
      setCaption(data.caption)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Caption generation failed")
    } finally {
      setGeneratingCaption(false)
    }
  }

  /* -- AI generation (existing) -- */
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed")
    } finally { setGen(false) }
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI image generation failed")
    } finally { setGenImg(false) }
  }

  async function regenerateCaption() {
    if (!preview) return
    const text = brief.trim() || preview.topic || 'update'
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Caption regeneration failed")
    } finally { setGenCap(false) }
  }

  function pickFestival(f: Festival) {
    if (!accountId) { setError("Connect an Instagram account first"); return }
    setBrief(f.greeting); setMode("ai"); generate(f.greeting)
  }

  async function publish(scheduleAt?: string) {
    if (!accountId) return
    setPosting(true); setError("")
    try {
      let mediaUrl = uploadedUrl || preview?.image_url || null
      if (uploadedFile && !uploadedUrl) {
        setUploading(true)
        try {
          mediaUrl = await uploadMedia(uploadedFile)
          setUploadedUrl(mediaUrl)
        } finally {
          setUploading(false)
        }
      }
      // Build full caption with hashtags if generated
      let fullCaption = caption || preview?.caption || ""
      if (generatedCaption && generatedCaption.hashtags.length > 0 && !fullCaption.includes("#")) {
        const hashtagStr = generatedCaption.hashtags.map(h => h.tag).join(" ")
        fullCaption = `${fullCaption}\n\n${hashtagStr}`
      }
      if (!mediaUrl && !fullCaption) { setError("Add media or generate content first"); setPosting(false); return }

      const res = await fetch("/api/posts/custom/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          caption: fullCaption,
          image_url: mediaUrl,
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

  /* ── Shared: account name helper ── */
  const acctName = accounts.find(a => a.id === accountId)?.account_name || "account"

  /* ── Instagram Mockup Preview (reusable) ── */
  const igPreview = (preview || (mode === "upload" && (uploadedFile || uploadPreview))) ? (
    <div>
      <div style={{
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--card-bg, #fff)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}>
        {/* IG Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              padding: 2, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div className="flex items-center justify-center text-[10px] font-bold" style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "var(--card-bg, #fff)", color: "var(--accent)",
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
                <video src={uploadPreview} className="w-full aspect-square object-cover" style={{ display: "block" }} muted />
              ) : (
                <img src={uploadPreview} alt="" className="w-full aspect-square object-cover" style={{ display: "block" }} />
              )
            ) : (
              <img src={preview!.image_url} alt="" className="w-full aspect-square object-cover" style={{ display: "block" }} />
            )
          ) : (
            <div className="w-full aspect-square flex items-center justify-center" style={{ background: "var(--bg)" }}>
              <div className="text-center" style={{ color: "var(--text-muted)" }}>
                <ImagePlus size={36} className="mx-auto mb-2" style={{ opacity: 0.25 }} />
                <p className="text-xs font-medium">No image yet</p>
              </div>
            </div>
          )}
          {genImg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
            }}>
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

        {/* IG Caption */}
        <div className="px-3.5 pb-3.5">
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            <span className="font-semibold mr-1">{acctName}</span>
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {(caption || preview?.caption || "Your caption will appear here...").length > 120
                ? (caption || preview?.caption || "").slice(0, 120) + "..."
                : (caption || preview?.caption || "Your caption will appear here...")}
            </span>
          </p>
          {(caption || preview?.caption || "").length > 120 && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>more</span>
          )}
          <p className="text-[10px] mt-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Just now</p>
        </div>
      </div>
      <p className="text-center text-[10px] mt-2 font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
        Preview
      </p>
    </div>
  ) : null

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">{tabConfig.title.split(" ")[0]} <em>{tabConfig.title.split(" ")[1]}</em></h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tabConfig.desc}</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0" style={{ background: "rgba(255,77,77,0.1)", color: "var(--accent)" }}>
          {credits} credits
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.value
          return (
            <button key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPreview(null); setError(""); setCaption(""); setGeneratedCaption(null); setCaptionLimitError(null); setAngle(""); clearUpload() }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-muted)" }}>
              <Icon size={14} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: currentStep >= step.num ? "var(--accent)" : "var(--bg)",
                  color: currentStep >= step.num ? "#fff" : "var(--text-muted)",
                  border: currentStep >= step.num ? "none" : "1px solid var(--border)",
                }}>
                {currentStep > step.num ? "✓" : step.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: currentStep >= step.num ? "var(--text-primary)" : "var(--text-muted)" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px" style={{ background: currentStep > step.num ? "var(--accent)" : "var(--border)" }} />
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
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("upload")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: mode === "upload" ? "var(--bg-card)" : "transparent",
            color: mode === "upload" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "upload" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: mode === "upload" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}>
          <Upload size={14} /> Upload media
        </button>
        <button onClick={() => setMode("ai")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: mode === "ai" ? "var(--bg-card)" : "transparent",
            color: mode === "ai" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "ai" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: mode === "ai" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}>
          <Sparkles size={14} /> AI generate
        </button>
      </div>

      {/* ═══════════ SPLIT LAYOUT ═══════════ */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── LEFT COLUMN: Form ── */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4">

          {/* Upload mode */}
          {mode === "upload" && (
            <div className="card p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Instagram account</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
                </select>
              </div>

              {/* Drag and drop */}
              {!uploadedFile ? (
                <div className="relative rounded-2xl p-6 text-center cursor-pointer transition-all"
                  style={{ border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--border)", background: isDragging ? "rgba(10,10,10,0.03)" : "var(--bg)" }}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept={tabConfig.accept} className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  <Upload size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Drop your {tabConfig.dropLabel} here</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Or select a file · {tabConfig.formats}</p>
                </div>
              ) : (
                <div className="relative">
                  {uploadedFile.type.startsWith("video/") ? (
                    <video src={uploadPreview!} controls className="w-full rounded-xl" style={{ maxHeight: 240 }} />
                  ) : (
                    <img src={uploadPreview!} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 240 }} />
                  )}
                  <button onClick={clearUpload}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                    <X size={14} />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 text-sm" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", color: "var(--text-muted)" }}>
                      <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /><span>Uploading...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Generate caption (upload mode) */}
              {uploadedFile && !generatedCaption && !captionLimitError && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start gap-2">
                    <Zap size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent-brand)" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generate caption</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Tell us the angle, or just hit Generate.
                      </p>
                    </div>
                  </div>
                  <input type="text" value={angle} onChange={e => setAngle(e.target.value)}
                    placeholder="e.g. motivational, behind the scenes..."
                    style={inputStyle} />
                  <button onClick={() => generateCaption()} disabled={generatingCaption || !uploadedFile}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {generatingCaption ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate</>}
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

              {/* Generated caption result */}
              {generatedCaption && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {generatedCaption.tones.map((tone, i) => (
                      <button key={i} onClick={() => { setSelectedTone(tone.label); generateCaption(tone.label) }}
                        disabled={generatingCaption}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: selectedTone === tone.label ? toneColor(tone.score) : `${toneColor(tone.score)}15`,
                          color: selectedTone === tone.label ? '#fff' : toneColor(tone.score),
                          border: selectedTone === tone.label ? `2px solid ${toneColor(tone.score)}` : '2px solid transparent',
                        }}>
                        {tone.label} {tone.score}%
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Caption</label>
                      <span className="text-xs" style={{ color: caption.length > 2200 ? "#ef4444" : "var(--text-muted)" }}>{caption.length} / 2,200</span>
                    </div>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4} style={{ ...inputStyle, resize: "none" }} />
                  </div>
                  {generatedCaption.hashtags.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}><Hash size={11} className="inline mr-1" />Hashtags</label>
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
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{generatedCaption.generations_used} / {generatedCaption.generations_limit} captions used</p>
                  <button onClick={() => { setSelectedTone(null); generateCaption() }} disabled={generatingCaption}
                    className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
                    {generatingCaption ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate
                  </button>
                </div>
              )}

              {/* Manual caption */}
              {!generatedCaption && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Caption</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
                    placeholder={`Write your ${activeTab} caption here...`}
                    style={{ ...inputStyle, resize: "none" }} />
                </div>
              )}

              {/* Post + Schedule */}
              <button onClick={() => publish()} disabled={posting || uploading || (!uploadedFile && !caption)}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50">
                {posting ? <><Loader2 size={16} className="animate-spin" /> {uploading ? "Uploading..." : "Posting..."}</> : <><Send size={16} /> {activeTab === "reel" ? "Post reel" : activeTab === "story" ? "Post story" : "Post now"}</>}
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
                <Clock size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>or schedule for</span>
                <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="flex-1 text-sm" style={inputStyle} />
                <button onClick={() => publish(scheduledFor)} disabled={posting || uploading || !scheduledFor || (!uploadedFile && !caption)}
                  className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">Schedule</button>
              </div>
            </div>
          )}

          {/* AI mode */}
          {mode === "ai" && (
            <div className="space-y-4">
              {/* Festivals */}
              {upcoming.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <PartyPopper size={14} style={{ color: "var(--accent)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upcoming festivals</p>
                  </div>
                  <p className="text-xs mb-2.5" style={{ color: "var(--text-muted)" }}>One click drafts a greeting post.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {upcoming.map(f => (
                      <button key={f.date + f.name} onClick={() => pickFestival(f)} disabled={gen || !accountId}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        <span aria-hidden>{f.emoji}</span><span className="font-medium">{f.name}</span>
                        <span style={{ color: "var(--text-muted)" }}>{whenLabel(f.date)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI form */}
              <div className="card p-5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Instagram account</label>
                  <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                    {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>What should this {activeTab} be about?</label>
                  <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3}
                    placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings"
                    style={{ ...inputStyle, resize: "none" }} />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>1 credit per generation. AI image costs extra.</p>
                </div>
                <button onClick={() => generate()} disabled={gen || !accountId}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {gen ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate {activeTab}</>}
                </button>
              </div>

              {/* AI Edit Controls (below form, shown when preview exists) */}
              {preview && (
                <div className="card p-5 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Edit caption</label>
                      <span className="text-xs tabular-nums" style={{ color: (caption || preview.caption).length > 2200 ? "#ef4444" : "var(--text-muted)" }}>
                        {(caption || preview.caption).length} / 2,200
                      </span>
                    </div>
                    <textarea
                      value={caption || preview.caption}
                      onChange={e => { const val = e.target.value; setPreview(p => p ? { ...p, caption: val } : p); setCaption(val) }}
                      rows={5}
                      className="w-full text-sm p-3 resize-y transition-colors"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", lineHeight: "1.6", borderRadius: 12 }}
                      placeholder="Edit your caption..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={regenerateCaption} disabled={genCap || gen || genImg}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10 }}>
                      {genCap ? <Loader2 size={14} className="animate-spin" /> : <Type size={14} />}
                      New caption <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>1 cr</span>
                    </button>
                    {aiImageProvider !== "none" && (
                      <button onClick={generateAIImage} disabled={genImg || gen || genCap || credits < aiImageCredits}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10 }}>
                        {genImg ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                        New image <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{aiImageCredits} cr</span>
                      </button>
                    )}
                  </div>

                  <button onClick={() => publish()} disabled={posting || genImg || genCap}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-50"
                    style={{ borderRadius: 12 }}>
                    {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> {activeTab === "reel" ? "Post reel" : activeTab === "story" ? "Post story" : "Post now"}</>}
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <Clock size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>or schedule</span>
                    <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="flex-1 text-sm" style={{ ...inputStyle, borderRadius: 10 }} />
                    <button onClick={() => publish(scheduledFor)} disabled={posting || !scheduledFor || genImg}
                      className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50" style={{ borderRadius: 10 }}>Schedule</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Live Instagram Preview (sticky) ── */}
        {igPreview && (
          <div className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-4">
            {igPreview}
          </div>
        )}

      </div>
    </div>
  )
}
