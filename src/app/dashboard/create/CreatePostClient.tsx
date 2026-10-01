"use client"

import { useMemo, useState, useRef, useCallback } from "react"
import { Sparkles, Loader2, RefreshCw, Send, CheckCircle2, Clock, PartyPopper, ImagePlus, Wand2, Upload, X, Image, Film, CircleDot } from "lucide-react"
import { upcomingFestivals, whenLabel, type Festival } from "@/lib/festivals"

interface Acct { id: string; account_name: string }
interface Preview { caption: string; image_url: string; topic: string }

type ContentTab = "post" | "reel" | "story"

const TAB_CONFIG: { value: ContentTab; label: string; icon: typeof Image; title: string }[] = [
  { value: "post", label: "Post", icon: Image, title: "Create post" },
  { value: "reel", label: "Reel", icon: Film, title: "Create reel" },
  { value: "story", label: "Story", icon: CircleDot, title: "Create story" },
]

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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Caption editing
  const [caption, setCaption] = useState("")
  const [mode, setMode] = useState<"upload" | "ai">("upload")

  const upcoming = useMemo(() => upcomingFestivals(45, 8), [])
  const tabConfig = TAB_CONFIG.find(t => t.value === activeTab)!

  /* -- Step indicator -- */
  const currentStep = !uploadedFile && !preview ? 1 : (!preview && !caption) ? 2 : 3
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
    setUploadedFile(file)
    setUploadPreview(URL.createObjectURL(file))
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
  }

  /* -- AI generation -- */
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
    const imgUrl = uploadPreview || preview?.image_url
    const capText = caption || preview?.caption
    if (!imgUrl && !capText) { setError("Add media or generate content first"); return }
    setPosting(true); setError("")
    try {
      const res = await fetch("/api/posts/custom/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          caption: capText,
          image_url: imgUrl,
          topic: preview?.topic || brief,
          content_type: activeTab,
          scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPosted(data.scheduled ? "scheduled" : "now")
      setPreview(null); setBrief(""); setScheduledFor(""); setCaption("")
      clearUpload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed")
    } finally { setPosting(false) }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">{tabConfig.title.split(" ")[0]} <em>{tabConfig.title.split(" ")[1]}</em></h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Upload media or use AI to create your {activeTab}.
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
              onClick={() => { setActiveTab(tab.value); setPreview(null); setError(""); setCaption("") }}
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
            {posted === "scheduled" ? "Scheduled — it will publish automatically at the chosen time." : "Post sent — it will appear on your account shortly."}
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
                accept={activeTab === "post" ? "image/*" : "image/*,video/*"}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Upload size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Drag & drop your {activeTab === "reel" ? "video" : "image"} here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                or click to browse {"·"} {activeTab === "post" ? "JPG, PNG, WebP" : "JPG, PNG, MP4, MOV"}
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
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Caption</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={3}
              placeholder="Write your caption here..."
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={() => publish()}
              disabled={posting || (!uploadedFile && !caption)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> Post now</>}
            </button>
          </div>

          {/* Schedule row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>or schedule for</span>
            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="flex-1 text-sm" style={inputStyle} />
            <button onClick={() => publish(scheduledFor)} disabled={posting || !scheduledFor || (!uploadedFile && !caption)} className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">Schedule</button>
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
                <p className="text-xs -mt-1" style={{ color: "var(--text-muted)" }}><ImagePlus size={11} className="inline mr-1" />Tap "AI image" to replace with a unique AI-generated image.</p>
              )}
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{preview.caption}</p>
              <div className="flex gap-2">
                <button onClick={() => generate()} disabled={gen || genImg} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
                  {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Regenerate <span className="text-xs" style={{ color: "var(--text-muted)" }}>(1 cr)</span>
                </button>
                <button onClick={() => publish()} disabled={posting || genImg} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> Post now</>}
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
