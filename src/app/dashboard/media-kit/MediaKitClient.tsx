'use client'

import { useState, useRef } from 'react'
import {
  FileText, Users, Heart, Eye, TrendingUp, BarChart3,
  Share2, Copy, CheckCircle2, Download, ExternalLink,
  Instagram, Image, Film, Layers, Globe, MapPin,
  Calendar, Sparkles,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────── */
interface Account {
  id: string
  account_name: string | null
  platform: string
  followers_count?: number
  following_count?: number
}

interface Post {
  id: string
  status: string
  content_type: string
  likes?: number
  comments?: number
  shares?: number
  reach?: number
  impressions?: number
  created_at: string
}

/* ── Helpers ───────────────────────────────────────── */
function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

/* ── Component ─────────────────────────────────────── */
export default function MediaKitClient({
  profile,
  biz,
  accounts,
  posts,
}: {
  profile: any
  biz: any
  accounts: Account[]
  posts: Post[]
}) {
  const [copied, setCopied] = useState(false)
  const kitRef = useRef<HTMLDivElement>(null)

  /* Computed stats */
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count ?? 0), 0)
  const totalPosts = posts.length
  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions ?? 0), 0)
  const engagementRate = totalImpressions > 0
    ? (((totalLikes + totalComments) / totalImpressions) * 100).toFixed(2)
    : '0.00'

  /* Content type breakdown */
  const typeBreakdown = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.content_type] = (acc[p.content_type] ?? 0) + 1
    return acc
  }, {})

  /* Top performing posts (by likes) */
  const topPosts = [...posts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 6)

  /* Avg posts per week */
  const firstPost = posts[posts.length - 1]
  const weeks = firstPost
    ? Math.max(1, Math.floor((Date.now() - new Date(firstPost.created_at).getTime()) / (7 * 86400000)))
    : 1
  const postsPerWeek = (totalPosts / weeks).toFixed(1)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/media-kit/${profile?.id ?? ''}`
    : ''

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const CONTENT_ICONS: Record<string, React.ElementType> = {
    post: Image,
    reel: Film,
    story: Eye,
    carousel: Layers,
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Media Kit</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Auto-generated media kit for brand partnerships and collaborations
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Media Kit Content */}
      <div ref={kitRef} className="space-y-6">
        {/* Profile Hero */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', border: 'none' }}
        >
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {(biz?.business_name ?? profile?.full_name ?? 'P').charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold text-white">{biz?.business_name || profile?.full_name || 'My Brand'}</h2>
          {biz?.description && (
            <p className="text-sm text-white/80 mt-2 max-w-md mx-auto">{biz.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-white/70 text-sm">
            {biz?.industry && (
              <span className="flex items-center gap-1"><Globe size={14} /> {biz.industry}</span>
            )}
            {biz?.language && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {biz.language === 'en' ? 'English' : biz.language}</span>
            )}
          </div>

          {/* Connected accounts */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                <Instagram size={12} />
                @{a.account_name}
                {a.followers_count ? ` • ${formatNum(a.followers_count)}` : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Followers',  value: formatNum(totalFollowers), icon: Users,      color: '#8b5cf6' },
            { label: 'Engagement Rate',   value: engagementRate + '%',     icon: Heart,       color: '#ef4444' },
            { label: 'Total Reach',       value: formatNum(totalReach),    icon: TrendingUp,  color: '#22c55e' },
            { label: 'Avg Posts/Week',    value: postsPerWeek,             icon: Calendar,    color: '#0ea5e9' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: s.color + '15' }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Content Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content type split */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Content Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(typeBreakdown).map(([type, count]) => {
                const pct = totalPosts > 0 ? ((count / totalPosts) * 100).toFixed(0) : '0'
                const Icon = CONTENT_ICONS[type] ?? Image
                const colors: Record<string, string> = { post: '#22c55e', reel: '#8b5cf6', story: '#f59e0b', carousel: '#0ea5e9' }
                const color = colors[type] ?? '#6b7280'
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color }} />
                        <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{type}s</span>
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
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Engagement Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Likes',       value: formatNum(totalLikes),       icon: Heart,       color: '#ef4444' },
                { label: 'Total Comments',     value: formatNum(totalComments),    icon: BarChart3,   color: '#3b82f6' },
                { label: 'Total Impressions',  value: formatNum(totalImpressions), icon: Eye,         color: '#f59e0b' },
                { label: 'Published Posts',    value: totalPosts.toString(),       icon: FileText,    color: '#22c55e' },
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
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Performing Content</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topPosts.map((p, i) => (
                <div key={p.id} className="rounded-xl p-3 relative" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div
                    className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: i === 0 ? '#eab308' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : 'var(--accent)' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex items-center justify-between mt-4 mb-2">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                      {p.content_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Heart size={10} /> {formatNum(p.likes ?? 0)}</span>
                    <span className="flex items-center gap-1"><Eye size={10} /> {formatNum(p.reach ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Topics */}
        {biz?.topics && biz.topics.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Sparkles size={24} style={{ color: 'var(--accent)' }} className="mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Interested in Collaborating?</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {biz?.business_name || profile?.full_name || 'We'} are open to brand partnerships, sponsored content, and collaborations.
          </p>
          <div className="flex items-center justify-center gap-3">
            {accounts.map(a => (
              <span key={a.id} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--accent)' }}>
                <Instagram size={14} />
                @{a.account_name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
