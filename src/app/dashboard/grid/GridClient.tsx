'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Grid3X3, Plus, Image as ImageIcon, Sparkles, Film, Copy,
} from 'lucide-react'

type Post = {
  id: string
  caption: string | null
  image_url: string | null
  status: string
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  content_type: string | null
  ig_media_id: string | null
}

type Props = {
  posts: Post[]
  accountName: string
  accountPicture: string | null
  activeAccountId: string | null
}

type AspectRatio = '1:1' | '4:5' | '3:4'

const RATIO_MAP: Record<AspectRatio, string> = {
  '1:1': '100%',
  '4:5': '125%',
  '3:4': '133.33%',
}

const LAYOUT_IDEAS = [
  {
    name: 'Checkerboard',
    desc: 'Alternate photos with graphic or text tiles so the feed reads as a pattern.',
    pattern: [1,0,1,0,1,0,1,0,1],
  },
  {
    name: 'Tonal flow',
    desc: 'Order posts light to dark so each row shifts gradually down the grid.',
    pattern: [0,0,0,0.3,0.3,0.3,0.6,0.6,0.6],
  },
  {
    name: 'Row by row',
    desc: 'Give every row of three one theme — a story told three tiles at a time.',
    pattern: [1,1,1,0,0,0,1,1,1],
  },
  {
    name: 'Mixed mosaic',
    desc: "No system — just keep two busy shots from ever sitting side by side.",
    pattern: [1,0,1,0,1,0,1,0,1],
  },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function contentTypeBadge(ct: string | null) {
  if (ct === 'reel') return { icon: Film, label: 'Reel' }
  if (ct === 'carousel') return { icon: Copy, label: 'Carousel' }
  return null
}

export default function GridClient({ posts, accountName, accountPicture, activeAccountId }: Props) {
  const [ratio, setRatio] = useState<AspectRatio>('3:4')
  const [safeZone, setSafeZone] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [igProfile, setIgProfile] = useState<{ followers_count: number; follows_count: number; media_count: number } | null>(null)

  // Fetch IG profile for follower/following counts
  useEffect(() => {
    if (!activeAccountId) return
    fetch(`/api/analytics/instagram?account_id=${activeAccountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.profile) {
          setIgProfile({
            followers_count: d.profile.followers_count ?? 0,
            follows_count: d.profile.follows_count ?? 0,
            media_count: d.profile.media_count ?? 0,
          })
        }
      })
      .catch(() => {})
  }, [activeAccountId])

  const published = useMemo(() => posts.filter(p => p.status === 'published'), [posts])
  const planned = useMemo(() => posts.filter(p => p.status === 'scheduled' || p.status === 'pending'), [posts])
  const liveCount = published.length
  const totalSlots = Math.ceil((liveCount + planned.length) / 3) * 3
  const openSlots = Math.max(0, totalSlots - liveCount - planned.length + 6) // Show at least 6 open

  // All posts for grid (published first, then planned)
  const gridPosts = useMemo(() => [...published, ...planned], [published, planned])

  // Build rows of 3
  const rows = useMemo(() => {
    const result: (Post | null)[][] = []
    // Show at least 4 rows (12 cells)
    const minCells = Math.max(gridPosts.length, 12)
    for (let i = 0; i < minCells; i += 3) {
      const row: (Post | null)[] = []
      for (let j = 0; j < 3; j++) {
        row.push(gridPosts[i + j] ?? null)
      }
      result.push(row)
    }
    return result
  }, [gridPosts])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-heading">
          Grid <em>planner</em>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Arrange what&apos;s coming next against what&apos;s already live, and see how the feed reads before anything publishes.
        </p>
      </div>

      {/* Aspect ratio + safe zone toolbar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {(['1:1', '4:5', '3:4'] as AspectRatio[]).map(r => (
            <button
              key={r}
              onClick={() => setRatio(r)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: ratio === r ? 'var(--accent)' : 'var(--bg-card)',
                color: ratio === r ? '#fff' : 'var(--text-muted)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSafeZone(!safeZone)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            background: safeZone ? 'var(--accent)' : 'var(--bg-card)',
            color: safeZone ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          Safe zone
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* ─── Left: Profile + Grid ─── */}
        <div>
          {/* Profile card */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-4">
              {/* Profile picture */}
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0" style={{ border: '2px solid var(--border)' }}>
                {accountPicture ? (
                  <img src={accountPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xl font-bold">
                    {accountName[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {igProfile?.media_count ?? liveCount}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {igProfile?.followers_count ?? '—'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {igProfile?.follows_count ?? '—'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Following</p>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {accountName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{accountName}</p>
            </div>
          </div>

          {/* IG-style tab bar */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-center gap-8 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <button className="flex items-center gap-1.5 text-xs font-bold pb-1"
                style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--text-primary)' }}>
                <Grid3X3 size={14} /> POSTS
              </button>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                REELS
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                TAGGED
              </span>
            </div>

            {/* Grid */}
            <div>
              {rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-3" style={{ gap: 2 }}>
                  {row.map((post, ci) => {
                    const cellIndex = ri * 3 + ci
                    if (!post) {
                      // Empty slot — "+" placeholder
                      return (
                        <Link
                          key={`empty-${ri}-${ci}`}
                          href="/dashboard/create"
                          className="relative flex items-center justify-center transition-opacity hover:opacity-80"
                          style={{
                            paddingBottom: RATIO_MAP[ratio],
                            background: 'var(--bg)',
                            border: '1px dashed var(--border)',
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Plus size={24} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
                          </div>
                        </Link>
                      )
                    }

                    const isHovered = hoveredId === post.id
                    const isPlanned = post.status !== 'published'
                    const badge = contentTypeBadge(post.content_type)
                    const date = post.published_at || post.scheduled_for || post.created_at

                    return (
                      <div
                        key={post.id}
                        className="relative cursor-pointer group overflow-hidden"
                        style={{ paddingBottom: RATIO_MAP[ratio] }}
                        onMouseEnter={() => setHoveredId(post.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="absolute inset-0">
                          {post.image_url ? (
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                              style={{
                                opacity: isPlanned ? 0.6 : 1,
                                filter: isPlanned ? 'brightness(0.8)' : 'none',
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: 'var(--bg)' }}>
                              <ImageIcon size={24} style={{ color: 'var(--border)' }} />
                            </div>
                          )}

                          {/* Content type badge (reel/carousel) */}
                          {badge && (
                            <div className="absolute top-1.5 right-1.5">
                              <badge.icon size={16} className="text-white drop-shadow-md" />
                            </div>
                          )}

                          {/* Planned overlay */}
                          {isPlanned && (
                            <div className="absolute bottom-0 inset-x-0 px-2 py-1.5"
                              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                              <p className="text-[10px] text-white font-medium">
                                {formatDate(post.scheduled_for || post.created_at)}
                              </p>
                            </div>
                          )}

                          {/* Date label for published */}
                          {!isPlanned && post.published_at && (
                            <div className="absolute bottom-0 inset-x-0 px-2 py-1"
                              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                              <p className="text-[10px] text-white/80">
                                {formatDate(post.published_at)}
                              </p>
                            </div>
                          )}

                          {/* Hover overlay */}
                          {isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center"
                              style={{ background: 'rgba(0,0,0,0.5)' }}>
                              <p className="text-xs text-white text-center px-3 line-clamp-4 leading-snug">
                                {post.caption?.slice(0, 120) || 'No caption'}
                              </p>
                            </div>
                          )}

                          {/* Safe zone overlay */}
                          {safeZone && ratio !== '1:1' && (
                            <div className="absolute inset-0 pointer-events-none"
                              style={{
                                border: '2px dashed rgba(232,80,58,0.4)',
                                margin: ratio === '4:5' ? '12.5% 0' : '16.67% 0',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* "The first nine" label */}
            {rows.length >= 3 && (
              <div className="px-4 py-2 text-center text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                The first nine — what a visitor sees before scrolling
              </div>
            )}
          </div>
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="flex flex-col gap-4">
          {/* At a glance */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              At a glance
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{planned.length}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Planned</p>
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {liveCount}/{igProfile?.media_count ?? liveCount}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Live</p>
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{openSlots}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Open slots</p>
              </div>
            </div>
          </div>

          {/* Up next */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Up next
            </h3>
            {planned.length > 0 ? (
              <div className="flex flex-col gap-2">
                {planned.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--border)' }}>
                          <ImageIcon size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.caption?.slice(0, 40) || 'No caption'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(p.scheduled_for || p.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                Nothing scheduled yet. Drop a photo on an open slot, or start one in the composer.
                <Link
                  href="/dashboard/create"
                  className="btn-primary mt-3 text-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={12} /> Plan a post
                </Link>
              </div>
            )}
          </div>

          {/* Reading your grid — tips */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Grid3X3 size={14} /> Reading your grid
            </h3>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
              The top three rows are what a new visitor judges first, so build those before working down.
              Squint at the whole grid: if two similar shots sit side by side, move one.
            </p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
              Instagram lets you pin up to 3 posts to the top of your profile. Meta&apos;s API doesn&apos;t report which posts are pinned, so a pinned post shows here in date order rather than at the top.
            </p>

            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Layout ideas
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_IDEAS.map(idea => (
                <div key={idea.name} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                  {/* Mini pattern preview */}
                  <div className="grid grid-cols-3 gap-px w-8 h-8 shrink-0 rounded overflow-hidden">
                    {idea.pattern.map((v, i) => (
                      <div key={i} style={{
                        background: v > 0.5 ? 'var(--accent)' : v > 0 ? 'var(--accent-subtle)' : 'var(--border)',
                        opacity: v > 0 ? 0.5 + v * 0.5 : 0.3,
                      }} />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{idea.name}</p>
                    <p className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>{idea.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
