"use client"

import { useMemo, useState, useRef, useCallback } from "react"
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper, ImagePlus, Wand2, Upload, X, Image, Film, CircleDot, Hash, ArrowUpRight, Zap } from "lucide-react"
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

  /* -- Generate caption from uploaded media -- */
  async function generateCaption() {
    if (!uploadedFile) return
    setGeneratingCaption(true); setError(""); setCaptionLimitError(null)

    try {
      // Upload media first if not already uploaded
      let mediaUrl = uploadedUrl
      if (!mediaUrl) {
        setUploading(true)
        try {
          mediaUrl = await uploadMedia(uploadedFile)
          setUploadedUrl(mediaUrl)
        } finally {
          setUploading(false)
        }
      }

      const res = await fetch("/api/posts/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_url: mediaUrl,
          angle: angle.trim() || undefined,
          content_type: activeTab,
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">{tabConfig.title.split(" ")[0]} <em>{tabConfig.title.split(" ")[1]}</em></h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {tabConfig.desc}
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0" style={{ background: "rgba(255,77,77,0.1)", color: "var(--accent)" }}>
          {credits} credits
        </span>
      </div>

      {/* Tab switcher: Post / Reel / Story */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPreview(null); setError(""); setCaption(""); setGeneratedCaption(null); setCaptionLimitError(null); setAngle(""); clearUpload() }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#fff" : "var(--text-muted)",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: currentStep >= step.num ? "var(--accent)" : "var(--bg)",
                  color: currentStep >= step.num ? "#fff" : "var(--text-muted)",
                  border: currentStep >= step.num ? "none" : "1px solid var(--border)",
                }}
              >
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
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
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
        <div className="rounded-2xl p-3 mb-5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Mode toggle: Upload / AI Generate */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("upload")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: mode === "upload" ? "var(--bg-card)" : "transparent",
            color: mode === "upload" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "upload" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: mode === "upload" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <Upload size={14} /> Upload media
        </button>
        <button
          onClick={() => setMode("ai")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: mode === "ai" ? "var(--bg-card)" : "transparent",
            color: mode === "ai" ? "var(--text-primary)" : "var(--text-muted)",
            border: mode === "ai" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: mode === "ai" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <Sparkles size={14} /> AI generate
        </button>
      </div>

      {/* Upload mode */}
      {mode === "upload" && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Instagram account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
            </select>
          </div>

          {/* Drag and drop upload area */}
          {!uploadedFile ? (
            <div
              className="relative rounded-2xl p-8 text-center cursor-pointer transition-all"
              style={{
                border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--border)",
                background: isDragging ? "rgba(10,10,10,0.03)" : "var(--bg)",
              }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={tabConfig.accept}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Upload size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Drop your {tabConfig.dropLabel} here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Or select a file {"·"} {tabConfig.formats}
              </p>
            </div>
          ) : (
            <div className="relative">
              {uploadedFile.type.startsWith("video/") ? (
                <video src={uploadPreview!} controls className="w-full max-w-sm rounded-xl" style={{ maxHeight: 300 }} />
              ) : (
                <img src={uploadPreview!} alt="" className="w-full max-w-sm rounded-xl object-cover" style={{ maxHeight: 300 }} />
              )}
              <button
                onClick={clearUpload}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
              >
                <X size={14} />
              </button>
              {uploading && (
                <div className="absolute inset-0 max-w-sm rounded-xl flex flex-col items-center justify-center gap-2 text-sm" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", color: "var(--text-muted)" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /><span>Uploading media...</span>
                </div>
              )}
            </div>
          )}

          {/* ── Generate Caption Section (shown after media upload) ── */}
          {uploadedFile && !generatedCaption && !captionLimitError && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-2">
                <Zap size={16} className="shrink-0 mt-0.5" style={{ color: "var(--accent-brand)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generate caption</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Tell us the angle you want, or just hit Generate and we'll read your {activeTab === "reel" ? "video" : "photo"} and write one.
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={angle}
                onChange={e => setAngle(e.target.value)}
                placeholder="e.g. motivational, behind the scenes, product showcase..."
                style={inputStyle}
              />
              <button
                onClick={generateCaption}
                disabled={generatingCaption || !uploadedFile}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {generatingCaption ? (
                  <><Loader2 size={16} className="animate-spin" /> {uploading ? "Uploading media..." : "Generating caption..."}</>
                ) : (
                  <><Sparkles size={16} /> Generate</>
                )}
              </button>
            </div>
          )}

          {/* ── Caption Limit Reached ── */}
          {captionLimitError && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="flex items-start gap-2">
                <Zap size={16} className="shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#d97706" }}>You've hit your caption limit</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {captionLimitError.generations_limit} caption generations / month on Free
                  </p>
                </div>
              </div>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                You've used all {captionLimitError.generations_limit} caption generations this month. Resets {captionLimitError.reset_date} or upgrade to Pro for more.
              </p>
              <a
                href="/dashboard/billing"
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                style={{ textDecoration: "none" }}
              >
                <ArrowUpRight size={16} /> Upgrade to Pro
              </a>
              <button
                onClick={() => setCaptionLimitError(null)}
                className="w-full text-center text-xs py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Maybe later
              </button>
            </div>
          )}

          {/* ── Generated Caption Result ── */}
          {generatedCaption && (
            <div className="space-y-4">
              {/* Tone indicators */}
              <div className="flex flex-wrap gap-2">
                {generatedCaption.tones.map((tone, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: `${toneColor(tone.score)}15`, color: toneColor(tone.score) }}
                  >
                    {tone.label} {tone.score}%
                  </span>
                ))}
              </div>

              {/* CAPTION section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Caption</label>
                  <span className="text-xs" style={{ color: caption.length > 2200 ? "#ef4444" : "var(--text-muted)" }}>
                    {caption.length} / 2,200
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              {/* HASHTAGS section */}
              {generatedCaption.hashtags.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    <Hash size={12} className="inline mr-1" />Hashtags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {generatedCaption.hashtags.map((h, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: hashColor(h.relevance), color: hashTextColor(h.relevance) }}
                      >
                        {h.tag}
                        <span className="text-[10px] opacity-70">{h.relevance}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation count */}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {generatedCaption.generations_used} / {generatedCaption.generations_limit} caption generations used this month
              </p>

              {/* Regenerate */}
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {generatingCaption ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate caption
              </button>
            </div>
          )}

          {/* Caption (manual entry or editing — only show if no generated caption yet) */}
          {!generatedCaption && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                placeholder={`Write your ${activeTab} caption here...`}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>
          )}

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={() => publish()}
              disabled={posting || uploading || (!uploadedFile && !caption)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {posting ? <><Loader2 size={16} className="animate-spin" /> {uploading ? "Uploading..." : "Posting..."}</> : <><Send size={16} /> {activeTab === "reel" ? "Post reel" : activeTab === "story" ? "Post story" : "Post now"}</>}
            </button>
          </div>

          {/* Schedule row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>or schedule for</span>
            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="flex-1 text-sm" style={inputStyle} />
            <button onClick={() => publish(scheduledFor)} disabled={posting || uploading || !scheduledFor || (!uploadedFile && !caption)} className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">Schedule</button>
          </div>
        </div>
      )}

      {/* AI mode */}
      {mode === "ai" && (
        <>
          {/* Festivals */}
          {upcoming.length > 0 && (
            <div className="card p-6 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <PartyPopper size={16} style={{ color: "var(--accent)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upcoming festivals & occasions</p>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>One click drafts a greeting post you can edit, post now, or schedule.</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.map(f => (
                  <button key={f.date + f.name} onClick={() => pickFestival(f)} disabled={gen || !accountId} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <span aria-hidden>{f.emoji}</span><span className="font-medium">{f.name}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{whenLabel(f.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI form */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Instagram account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                {accounts.map(a => <option key={a.id} value={a.id}>@{a.account_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>What should this {activeTab} be about?</label>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3} placeholder="e.g. Diwali wishes to our patients · Weekend 20% off on cleanings" style={{ ...inputStyle, resize: "none" }} />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Generating costs 1 credit (Pexels stock photo included).</p>
            </div>
            <button onClick={() => generate()} disabled={gen || !accountId} className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {gen ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate {activeTab}</>}
            </button>
          </div>

          {/* AI Preview */}
          {preview && (
            <div className="card p-6 mt-5 space-y-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preview</p>
              <div className="relative">
                {preview.image_url ? (
                  <img src={preview.image_url} alt="" className="w-full max-w-sm rounded-xl object-cover" />
                ) : (
                  <div className="w-full max-w-sm h-48 rounded-xl flex items-center justify-center text-sm" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>No image</div>
                )}
                {!genImg && aiImageProvider !== "none" && (
                  <button onClick={generateAIImage} disabled={genImg || credits < aiImageCredits} title={credits < aiImageCredits ? `Need ${aiImageCredits} credits` : "Generate AI image"} className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-all" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <Wand2 size={13} /> AI image <span style={{ color: "var(--text-muted)" }}>({aiImageCredits} cr)</span>
                  </button>
                )}
                {genImg && (
                  <div className="absolute inset-0 max-w-sm rounded-xl flex flex-col items-center justify-center gap-2 text-sm" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", color: "var(--text-muted)" }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /><span>Generating AI image...</span>
                  </div>
                )}
              </div>
              {aiImageProvider !== "none" && (
                <p className="text-xs -mt-1" style={{ color: "var(--text-muted)" }}><ImagePlus size={11} className="inline mr-1" />Tap &quot;AI image&quot; to replace with a unique AI-generated image.</p>
              )}
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{preview.caption}</p>
              <div className="flex gap-2">
                <button onClick={() => generate()} disabled={gen || genImg} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
                  {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Regenerate <span className="text-xs" style={{ color: "var(--text-muted)" }}>(1 cr)</span>
                </button>
                <button onClick={() => publish()} disabled={posting || genImg} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> {activeTab === "reel" ? "Post reel" : activeTab === "story" ? "Post story" : "Post now"}</>}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
                <Clock size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>or schedule for</span>
                <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="flex-1 text-sm" style={inputStyle} />
                <button onClick={() => publish(scheduledFor)} disabled={posting || !scheduledFor || genImg} className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">Schedule</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
