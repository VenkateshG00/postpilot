'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
 Grid3X3, Plus, Eye, EyeOff, Image as ImageIcon, Sparkles,
} from 'lucide-react'

type Post = {
 id: string
 caption: string | null
 image_url: string | null
 status: string
 scheduled_for: string | null
 published_at: string | null
 created_at: string
}

type Props = {
 posts: Post[]
 accountName: string
}

type ViewFilter = 'all' | 'published' | 'upcoming'

const cardStyle: React.CSSProperties = {
 background: 'var(--bg-card)',
 border: '1px solid var(--border)',
 borderRadius: 16,
}

function statusBadge(status: string) {
 if (status === 'published') return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Published' }
 if (status === 'scheduled') return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Scheduled' }
 return { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Pending' }
}

export default function GridClient({ posts, accountName }: Props) {
 const [filter, setFilter] = useState<ViewFilter>('all')
 const [hoveredId, setHoveredId] = useState<string | null>(null)
 const [showCaptions, setShowCaptions] = useState(false)

 const filtered = useMemo(() => {
 if (filter === 'published') return posts.filter(p => p.status === 'published')
 if (filter === 'upcoming') return posts.filter(p => p.status === 'scheduled' || p.status === 'pending')
 return posts
 }, [posts, filter])

 /* Build rows of 3 for the Instagram-style grid */
 const rows = useMemo(() => {
 const result: Post[][] = []
 for (let i = 0; i < filtered.length; i += 3) {
 result.push(filtered.slice(i, i + 3))
 }
 return result
 }, [filtered])

 const publishedCount = posts.filter(p => p.status === 'published').length
 const upcomingCount = posts.filter(p => p.status !== 'published').length

 return (
 <div>
 {/* Header */}
 <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
 <div>
 <h1 className="page-heading">
 Grid <em>planner</em>
 </h1>
 <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
 Preview how your Instagram profile grid will look
 </p>
 </div>
 <Link
 href="/dashboard/create"
 className="btn-primary flex items-center gap-2 shrink-0"
 >
 <Plus size={14} /> New post
 </Link>
 </div>

 {/* Profile header mock */}
 <div className="card p-6 mb-5">
 <div className="flex items-center gap-4 sm:gap-6">
 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0">
 {accountName[0]?.toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
 @{accountName}
 </p>
 <div className="flex items-center gap-4 sm:gap-6 mt-2">
 <div className="text-center">
 <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>{publishedCount}</p>
 <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Posts</p>
 </div>
 <div className="text-center">
 <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>{upcomingCount}</p>
 <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Upcoming</p>
 </div>
 <div className="text-center">
 <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>—</p>
 <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Followers</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Filter bar */}
 <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
 <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
 {([
 { key: 'all', label: 'All' },
 { key: 'published', label: 'Published' },
 { key: 'upcoming', label: 'Upcoming' },
 ] as { key: ViewFilter; label: string }[]).map(f => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 className="px-4 py-2 text-xs font-semibold transition-colors"
 style={{
 background: filter === f.key ? 'var(--accent)' : 'var(--bg-card)',
 color: filter === f.key ? '#fff' : 'var(--text-muted)',
 }}
 >
 {f.label}
 </button>
 ))}
 </div>

 <button
 onClick={() => setShowCaptions(!showCaptions)}
 className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
 >
 {showCaptions ? <EyeOff size={13} /> : <Eye size={13} />}
 {showCaptions ? 'Hide' : 'Show'} captions
 </button>
 </div>

 {/* Grid */}
 {rows.length > 0 ? (
 <div className="card overflow-hidden">
 {/* IG-style tab bar */}
 <div className="flex items-center justify-center gap-8 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
 <button className="flex items-center gap-1.5 text-xs font-bold pb-1"
 style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--text-primary)' }}>
 <Grid3X3 size={14} /> POSTS
 </button>
 <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
 REELS
 </span>
 <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
 TAGGED
 </span>
 </div>

 {/* Grid rows */}
 <div>
 {rows.map((row, ri) => (
 <div key={ri} className="grid grid-cols-3" style={{ gap: 2 }}>
 {row.map(post => {
 const s = statusBadge(post.status)
 const isHovered = hoveredId === post.id
 return (
 <div
 key={post.id}
 className="relative aspect-square cursor-pointer group"
 onMouseEnter={() => setHoveredId(post.id)}
 onMouseLeave={() => setHoveredId(null)}
 >
 {post.image_url ? (
 <img
 src={post.image_url}
 alt=""
 className="w-full h-full object-cover"
 style={{
 opacity: post.status !== 'published' ? 0.7 : 1,
 filter: post.status !== 'published' ? 'brightness(0.85)' : 'none',
 }}
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center"
 style={{ background: 'var(--bg)' }}>
 <ImageIcon size={24} style={{ color: 'var(--border)' }} />
 </div>
 )}

 {/* Status badge */}
 {post.status !== 'published' && (
 <span
 className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
 style={{ background: s.bg, color: s.color, backdropFilter: 'blur(4px)' }}
 >
 {s.label}
 </span>
 )}

 {/* Hover overlay */}
 {isHovered && (
 <div className="absolute inset-0 flex items-center justify-center"
 style={{ background: 'rgba(0,0,0,0.5)' }}>
 <p className="text-xs text-white text-center px-3 line-clamp-4 leading-snug">
 {post.caption?.slice(0, 100) || 'No caption'}
 </p>
 </div>
 )}

 {/* Caption below image when toggled */}
 {showCaptions && (
 <div className="absolute bottom-0 inset-x-0 p-2"
 style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
 <p className="text-[10px] text-white line-clamp-2 leading-snug">
 {post.caption?.slice(0, 60) || '—'}
 </p>
 </div>
 )}
 </div>
 )
 })}
 {/* Fill empty cells in incomplete rows */}
 {row.length < 3 && Array.from({ length: 3 - row.length }, (_, i) => (
 <Link
 key={`empty-${ri}-${i}`}
 href="/dashboard/create"
 className="aspect-square flex items-center justify-center transition-opacity hover:opacity-80"
 style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
 >
 <div className="text-center">
 <Plus size={20} style={{ color: 'var(--text-muted)', opacity: 0.3 }} className="" />
 <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>Add post</p>
 </div>
 </Link>
 ))}
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="card p-12 text-center">
 <Grid3X3 size={36} className=" mb-3" style={{ color: 'var(--border)' }} />
 <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
 No posts yet
 </p>
 <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
 Create posts to see how your grid will look
 </p>
 <Link
 href="/dashboard/create"
 className="btn-primary inline-flex items-center gap-2"
 >
 <Sparkles size={14} /> Create your first post
 </Link>
 </div>
 )}

 {/* Tips */}
 <div className="card mt-5 p-6">
 <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
 Grid Planning Tips
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 { title: 'Color Consistency', desc: 'Use a consistent color palette across posts for a cohesive look.' },
 { title: 'Alternate Content', desc: 'Mix quotes, photos, and graphics so the grid doesn\'t feel repetitive.' },
 { title: 'Row Themes', desc: 'Plan each row of 3 around a theme for visual storytelling.' },
 ].map(tip => (
 <div key={tip.title} className="p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
 <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
 <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tip.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 )
}
