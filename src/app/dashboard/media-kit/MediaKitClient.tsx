'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
 FileText, Users, Heart, Eye, TrendingUp, BarChart3,
 Share2, Copy, CheckCircle2, Download, ExternalLink,
 Instagram, Image, Film, Layers, Globe, MapPin,
 Calendar, Sparkles, Loader2,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────── */
interface IGProfile {
 username: string
 media_count: number
 followers_count: number
 follows_count: number
 profile_picture: string | null
}

interface IGPost {
 id: string
 caption: string
 media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
 media_url: string | null
 thumbnail_url: string | null
 timestamp: string
 permalink: string | null
 like_count: number
 comments_count: number
}

interface IGSummary {
 total_posts: number
 total_likes: number
 total_comments: number
 engagement_rate: number
 followers: number
}

/* ── Helpers ───────────────────────────────────────── */
function fmt(n: number) {
 if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
 if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
 return n.toString()
}

/* ── Component ─────────────────────────────────────── */
export default function MediaKitClient({
 profile,
 biz,
}: {
 profile: any
 biz: any
}) {
 const [copied, setCopied] = useState(false)
 const kitRef = useRef<HTMLDivElement>(null)
 const [loading, setLoading] = useState(true)
 const [igProfile, setIgProfile] = useState<IGProfile | null>(null)
 const [igPosts, setIgPosts] = useState<IGPost[]>([])
 const [igSummary, setIgSummary] = useState<IGSummary | null>(null)

 // Fetch real Instagram data from API
 useEffect(() => {
 setLoading(true)
 fetch('/api/analytics/instagram')
 .then(r => r.json())
 .then(d => {
 if (d.profile) setIgProfile(d.profile)
 if (d.posts) setIgPosts(d.posts)
 if (d.summary) setIgSummary(d.summary)
 })
 .catch(() => {})
 .finally(() => setLoading(false))
 }, [])

 /* Computed stats from real Instagram data */
 const totalFollowers = igProfile?.followers_count ?? 0
 const totalPosts = igSummary?.total_posts ?? 0
 const totalLikes = igSummary?.total_likes ?? 0
 const totalComments = igSummary?.total_comments ?? 0
 const engagementRate = igSummary?.engagement_rate?.toFixed(2) ?? '0.00'

 /* Total reach — sum of likes + comments as proxy (IG basic API doesn't expose reach) */
 const totalReach = totalLikes + totalComments

 /* Content type breakdown from real posts */
 const typeBreakdown = useMemo(() => {
 return igPosts.reduce<Record<string, number>>((acc, p) => {
 const type = p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : p.media_type === 'VIDEO' ? 'Reel' : 'Image'
 acc[type] = (acc[type] ?? 0) + 1
 return acc
 }, {})
 }, [igPosts])

 /* Top performing posts (by likes + comments) */
 const topPosts = useMemo(() => {
 return [...igPosts]
 .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
 .slice(0, 6)
 }, [igPosts])

 /* Avg posts per week */
 const postsPerWeek = useMemo(() => {
 if (igPosts.length === 0) return '0.0'
 const oldest = igPosts[igPosts.length - 1]
 const weeks = Math.max(1, Math.floor((Date.now() - new Date(oldest.timestamp).getTime()) / (7 * 86400000)))
 return (igPosts.length / weeks).toFixed(1)
 }, [igPosts])

 const shareUrl = typeof window !== 'undefined'
 ? `${window.location.origin}/media-kit/${profile?.id ?? ''}`
 : ''

 function copyShareLink() {
 navigator.clipboard.writeText(shareUrl)
 setCopied(true)
 setTimeout(() => setCopied(false), 2500)
 }

 const CONTENT_ICONS: Record<string, React.ElementType> = {
 Image: Image,
 Reel: Film,
 Carousel: Layers,
 }

 const CONTENT_COLORS: Record<string, string> = {
 Image: '#22c55e',
 Reel: '#8b5cf6',
 Carousel: '#0ea5e9',
 }

 if (loading) {
 return (
 <div className="">
 <div className="text-center">
 <Loader2 size={32} className="animate-spin mb-3" style={{ color: 'var(--accent)' }} />
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your media kit…</p>
 </div>
 </div>
 )
 }

 return (
 <div className="">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
 <div>
 <h1 className="page-heading">Media <em>Kit</em></h1>
 <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
 Auto-generated media kit from your real Instagram analytics
 </p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={copyShareLink}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
 >
 {copied ? <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} /> : <Copy size={14} />}
 {copied ? 'Copied!' : 'Copy Link'}
 </button>
 <button
 onClick={() => window.print()}
 className="btn-primary"
 >
 <Download size={14} />
 Export PDF
 </button>
 </div>
 </div>

 {/* Media Kit Content */}
 <div ref={kitRef} className="space-y-4 sm:space-y-6">
 {/* Profile Hero */}
 <div
 className="rounded-2xl p-6 sm:p-8 text-center"
 style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', border: 'none' }}
 >
 {igProfile?.profile_picture ? (
 <img src={igProfile.profile_picture} alt="" className="w-20 h-20 rounded-full mb-4 object-cover border-2 border-white/30" />
 ) : (
 <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-xl sm:text-2xl font-bold text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
 {(biz?.business_name ?? profile?.full_name ?? 'P').charAt(0).toUpperCase()}
 </div>
 )}
 <h2 className="text-xl sm:text-2xl font-bold text-white">{biz?.business_name || profile?.full_name || 'My Brand'}</h2>
 {igProfile && (
 <p className="text-sm text-white/80 mt-1">@{igProfile.username}</p>
 )}
 {biz?.description && (
 <p className="text-sm text-white/70 mt-2 max-w-md ">{biz.description}</p>
 )}
 <div className="flex items-center justify-center gap-4 mt-4 text-white/70 text-sm">
 {biz?.industry && (
 <span className="flex items-center gap-1"><Globe size={14} /> {biz.industry}</span>
 )}
 {biz?.language && (
 <span className="flex items-center gap-1"><MapPin size={14} /> {biz.language === 'en' ? 'English' : biz.language}</span>
 )}
 </div>

 {/* Follower / Following / Posts quick stats */}
 {igProfile && (
 <div className="flex items-center justify-center gap-6 mt-5">
 <div className="text-center">
 <p className="text-xl font-bold text-white">{fmt(igProfile.media_count)}</p>
 <p className="text-[10px] text-white/60 font-semibold">Posts</p>
 </div>
 <div className="text-center">
 <p className="text-xl font-bold text-white">{fmt(igProfile.followers_count)}</p>
 <p className="text-[10px] text-white/60 font-semibold">Followers</p>
 </div>
 <div className="text-center">
 <p className="text-xl font-bold text-white">{fmt(igProfile.follows_count)}</p>
 <p className="text-[10px] text-white/60 font-semibold">Following</p>
 </div>
 </div>
 )}
 </div>

 {/* Key Metrics */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: 'Total Followers', value: fmt(totalFollowers), icon: Users, color: '#8b5cf6' },
 { label: 'Engagement Rate', value: engagementRate + '%', icon: Heart, color: '#ef4444' },
 { label: 'Total Engagement', value: fmt(totalReach), icon: TrendingUp, color: '#22c55e' },
 { label: 'Avg Posts/Week', value: postsPerWeek, icon: Calendar, color: '#0ea5e9' },
 ].map(s => (
 <div key={s.label} className="rounded-2xl p-4 sm:p-5 text-center" >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color + '15' }}>
 <s.icon size={20} style={{ color: s.color }} />
 </div>
 <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
 <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
 </div>
 ))}
 </div>

 {/* Content Breakdown + Engagement Summary */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
 {/* Content type split */}
 <div className="rounded-2xl " >
 <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Content Breakdown</h3>
 <div className="space-y-3">
 {Object.entries(typeBreakdown).map(([type, count]) => {
 const pct = totalPosts > 0 ? ((count / totalPosts) * 100).toFixed(0) : '0'
 const Icon = CONTENT_ICONS[type] ?? Image
 const color = CONTENT_COLORS[type] ?? '#6b7280'
 return (
 <div key={type}>
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <Icon size={14} style={{ color }} />
 <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{type}s</span>
 </div>
 <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
 </div>
 <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
 <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: color }} />
 </div>
 </div>
 )
 })}
 {Object.keys(typeBreakdown).length === 0 && (
 <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No published content yet</p>
 )}
 </div>
 </div>

 {/* Engagement summary */}
 <div className="rounded-2xl " >
 <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Engagement Summary</h3>
 <div className="grid grid-cols-2 gap-4">
 {[
 { label: 'Total Likes', value: fmt(totalLikes), icon: Heart, color: '#ef4444' },
 { label: 'Total Comments', value: fmt(totalComments), icon: BarChart3, color: '#3b82f6' },
 { label: 'Engagement Rate', value: engagementRate + '%', icon: TrendingUp, color: '#f59e0b' },
 { label: 'Published Posts', value: totalPosts.toString(), icon: FileText, color: '#22c55e' },
 ].map(s => (
 <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--bg)' }}>
 <div className="flex items-center gap-2 mb-1">
 <s.icon size={12} style={{ color: s.color }} />
 <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
 </div>
 <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Top Content */}
 {topPosts.length > 0 && (
 <div className="rounded-2xl " >
 <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Performing Content</h3>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {topPosts.map((p, i) => (
 <a key={p.id} href={p.permalink ?? '#'} target="_blank" rel="noopener noreferrer"
 className="rounded-xl p-3 relative transition-all hover:brightness-95 block"
 style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
 >
 <div
 className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
 style={{ background: i === 0 ? '#eab308' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : 'var(--accent)' }}
 >
 {i + 1}
 </div>
 <div className="flex items-center justify-between mt-4 mb-2">
 <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
 {p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : p.media_type === 'VIDEO' ? 'Reel' : 'Image'}
 </span>
 </div>
 <p className="text-[10px] mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
 {p.caption ? p.caption.slice(0, 60) + (p.caption.length > 60 ? '…' : '') : 'No caption'}
 </p>
 <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
 <span className="flex items-center gap-1"><Heart size={10} /> {fmt(p.like_count)}</span>
 <span className="flex items-center gap-1"><BarChart3 size={10} /> {fmt(p.comments_count)}</span>
 </div>
 </a>
 ))}
 </div>
 </div>
 )}

 {/* Brand Topics */}
 {biz?.topics && biz.topics.length > 0 && (
 <div className="rounded-2xl " >
 <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Content Topics</h3>
 <div className="flex flex-wrap gap-2">
 {biz.topics.map((t: string) => (
 <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
 {t}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Collab CTA */}
 <div className="rounded-2xl text-center" >
 <Sparkles size={24} style={{ color: 'var(--accent)' }} className=" mb-3" />
 <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Interested in Collaborating?</h3>
 <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
 {biz?.business_name || profile?.full_name || 'We'} are open to brand partnerships, sponsored content, and collaborations.
 </p>
 {igProfile && (
 <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--accent)' }}>
 <Instagram size={14} />
 @{igProfile.username}
 </span>
 )}
 </div>
 </div>
 </div>
 )
}
