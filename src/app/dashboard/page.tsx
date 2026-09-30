export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import { Plus, ArrowRight, Sparkles, LayoutGrid, Calendar, Check, Instagram, Zap, MessageCircle, Users, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getActiveAccountId } from '@/lib/active-account'

const IG_API = 'https://graph.instagram.com'

/* ── Fetch Instagram profile + recent media for engagement rate ── */
async function fetchInstagramStats(accountId: string, token: string) {
  try {
    // Fetch profile and recent media in parallel
    const [profileRes, mediaRes] = await Promise.all([
      fetch(`${IG_API}/me?fields=id,username,media_count,followers_count,follows_count&access_token=${token}`),
      fetch(`${IG_API}/me/media?fields=id,like_count,comments_count&limit=25&access_token=${token}`),
    ])

    const profile = profileRes.ok ? await profileRes.json() : null
    const mediaData = mediaRes.ok ? await mediaRes.json() : null
    const media = mediaData?.data ?? []

    const totalLikes = media.reduce((s: number, m: any) => s + (m.like_count ?? 0), 0)
    const totalComments = media.reduce((s: number, m: any) => s + (m.comments_count ?? 0), 0)
    const totalEngagement = totalLikes + totalComments
    const followers = profile?.followers_count ?? 0
    const engagementRate = followers > 0 && media.length > 0
      ? ((totalEngagement / media.length) / followers * 100)
      : 0

    // Account reach: sum of likes + comments as proxy (real reach needs business account insights)
    const accountReach = totalEngagement

    return {
      followers: profile?.followers_count ?? 0,
      following: profile?.follows_count ?? 0,
      mediaCount: profile?.media_count ?? 0,
      engagementRate: Math.round(engagementRate * 10) / 10,
      accountReach,
    }
  } catch {
    return null
  }
}

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon?: React.ElementType }) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {Icon && <Icon size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
      </div>
      <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && (
        <p className="text-[10px] sm:text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  )
}

/* ── Setup Step (ReelDrop-style checklist row) ────── */
function SetupStep({
  step,
  title,
  description,
  href,
  done,
  icon: Icon,
}: {
  step: number
  title: string
  description: string
  href: string
  done: boolean
  icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all group"
      style={{
        background: done ? 'rgba(34,197,94,0.06)' : 'var(--bg)',
        border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
      }}
    >
      {/* Step number / check */}
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: done ? '#22c55e' : 'var(--accent)',
          color: '#fff',
        }}
      >
        {done ? <Check size={16} strokeWidth={3} /> : step}
      </div>

      {/* Icon — hidden on smallest screens */}
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hidden sm:flex items-center justify-center shrink-0"
        style={{
          background: done ? 'rgba(34,197,94,0.1)' : 'var(--accent-subtle)',
        }}
      >
        <Icon size={18} style={{ color: done ? '#22c55e' : 'var(--accent)' }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs sm:text-sm font-semibold"
          style={{
            color: done ? '#22c55e' : 'var(--text-primary)',
            textDecoration: done ? 'line-through' : 'none',
            opacity: done ? 0.7 : 1,
          }}
        >
          {title}
        </p>
        <p className="text-[11px] sm:text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>

      {/* Arrow */}
      {!done && (
        <ArrowRight
          size={16}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--accent)' }}
        />
      )}
    </Link>
  )
}

/* ── Helper to format numbers ── */
function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/* ── Page ──────────────────────────────────────────── */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_active', true)

  const activeId = await getActiveAccountId((accounts ?? []).map(a => a.id))

  let logsQ = supabase.from('post_logs').select('*').eq('user_id', user!.id)
  if (activeId) logsQ = logsQ.eq('social_account_id', activeId)
  let schedQ = supabase.from('schedules').select('*').eq('user_id', user!.id).eq('is_active', true)
  if (activeId) schedQ = schedQ.eq('social_account_id', activeId)

  const [{ data: biz }, { data: logs }, { data: schedules }] = await Promise.all([
    supabase.from('business_profiles').select('*').eq('user_id', user!.id).limit(1).maybeSingle(),
    logsQ.order('created_at', { ascending: false }).limit(30),
    schedQ,
  ])

  // Fetch Instagram stats if we have a connected account
  const activeAccount = accounts?.find(a => a.id === activeId) ?? accounts?.[0]
  const igStats = activeAccount?.access_token
    ? await fetchInstagramStats(activeAccount.account_id, activeAccount.access_token)
    : null

  const publishedCount = logs?.filter(l => l.status === 'published').length ?? 0
  const failedCount    = logs?.filter(l => l.status === 'failed').length ?? 0
  const pendingCount   = logs?.filter(l => l.status === 'pending').length ?? 0

  /* ── Setup checklist status ─────────────────────── */
  const hasAccount   = (accounts?.length ?? 0) > 0
  const hasSchedule  = (schedules?.length ?? 0) > 0
  const hasPublished = publishedCount > 0
  const stepsComplete = [hasAccount, hasSchedule, hasPublished].filter(Boolean).length
  const allDone = stepsComplete === 3

  /* Build this week Mon–Sun */
  const today    = new Date()
  const dow      = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  /* Group recent logs by date string */
  const logsByDate: Record<string, typeof logs> = {}
  logs?.forEach(log => {
    const key = new Date(log.created_at).toDateString()
    if (!logsByDate[key]) logsByDate[key] = []
    logsByDate[key]!.push(log)
  })

  const displayName = biz?.business_name ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-[26px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {allDone ? (
              <>Welcome back, <span style={{ color: 'var(--accent)' }}>{displayName}</span></>
            ) : (
              <>Hi <span style={{ color: 'var(--accent)' }}>{displayName}</span>, let&apos;s get your first post scheduled</>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {allDone
              ? "Here's what's happening with your account today"
              : 'Complete the steps below to start auto-posting'
            }
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-80 shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={14} />
          Create post
        </Link>
      </div>

      {/* ── Setup Checklist (shown until all 3 done) ── */}
      {!allDone && (
        <div
          className="rounded-2xl p-4 sm:p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Progress header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Zap size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Get started with PostPilot
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {stepsComplete} of 3 steps completed
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div
                className="flex-1 sm:w-32 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(stepsComplete / 3) * 100}%`,
                    background: stepsComplete === 3 ? '#22c55e' : 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                {Math.round((stepsComplete / 3) * 100)}%
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2 sm:space-y-3">
            <SetupStep
              step={1}
              title="Connect your Instagram account"
              description="Link your Instagram Business or Creator account to start publishing"
              href="/dashboard/connect"
              done={hasAccount}
              icon={Instagram}
            />
            <SetupStep
              step={2}
              title="Create your first schedule"
              description="Set up auto-posting with AI-generated captions and images"
              href="/dashboard/schedule"
              done={hasSchedule}
              icon={Calendar}
            />
            <SetupStep
              step={3}
              title="Publish your first post"
              description="Create and publish a post or let your schedule do it automatically"
              href="/dashboard/create"
              done={hasPublished}
              icon={Sparkles}
            />
          </div>
        </div>
      )}

      {/* ── Stats — Row 1: Instagram live stats (like ReelDrop) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
        <StatCard
          label="Total Followers"
          value={igStats ? fmt(igStats.followers) : '—'}
          icon={Users}
        />
        <StatCard
          label="Account Reach"
          value={igStats ? fmt(igStats.accountReach) : '—'}
          icon={Eye}
        />
        <StatCard
          label="Engagement Rate"
          value={igStats ? `${igStats.engagementRate}%` : '—'}
          sub={igStats ? undefined : 'Connect analytics'}
          icon={TrendingUp}
        />
      </div>

      {/* ── Stats — Row 2: PostPilot delivery stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Scheduled Posts"  value={schedules?.length ?? 0} sub={schedules?.length ? 'Auto-posting' : 'Nothing scheduled'} />
        <StatCard label="Posts Published"  value={publishedCount}         sub="All time" />
        <StatCard label="Posts Failed"     value={failedCount}            sub={failedCount > 0 ? 'Needs attention' : 'All good'} />
      </div>

      {/* ── Two-column: Calendar + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Content Calendar (2 cols on lg) */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Card header */}
          <div
            className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Content Calendar
            </h2>
            <Link
              href="/dashboard/calendar"
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {/* Day headers */}
          <div
            className="grid grid-cols-7 text-center py-2 px-1 sm:px-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
              const isToday = weekDays[i]?.toDateString() === today.toDateString()
              return (
                <div key={d} className="py-1 select-none">
                  <p className="text-[10px] sm:text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {d}
                  </p>
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mt-1 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold"
                    style={{
                      background: isToday ? 'var(--accent)' : 'transparent',
                      color: isToday ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {weekDays[i]?.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 2 time-slot rows */}
          {(['AM', 'PM'] as const).map((slot, rowIdx) => (
            <div
              key={slot}
              className="grid grid-cols-7"
              style={{
                borderBottom: rowIdx === 0 ? '1px solid var(--border)' : undefined,
                minHeight: 70,
              }}
            >
              {weekDays.map((day, i) => {
                const dayLogs = logsByDate[day.toDateString()] ?? []
                const slotLog = dayLogs[rowIdx]
                const isToday = day.toDateString() === today.toDateString()
                return (
                  <div
                    key={i}
                    className="p-1 sm:p-1.5 border-r last:border-r-0"
                    style={{
                      borderColor: 'var(--border)',
                      background: isToday ? 'var(--accent-subtle)' : 'transparent',
                    }}
                  >
                    {slotLog ? (
                      <div
                        className="rounded-lg p-1 sm:p-1.5 text-[10px] sm:text-[11px] leading-tight"
                        style={{
                          background: slotLog.status === 'published'
                            ? 'rgba(34,197,94,0.12)'
                            : 'rgba(255,77,77,0.12)',
                          color: slotLog.status === 'published' ? '#16a34a' : 'var(--accent)',
                          border: `1px solid ${slotLog.status === 'published' ? 'rgba(34,197,94,0.2)' : 'rgba(255,77,77,0.2)'}`,
                        }}
                      >
                        <p className="font-semibold truncate">
                          {slotLog.caption?.slice(0, 14) || 'Post'}
                        </p>
                        <p className="opacity-70 mt-0.5 hidden sm:block">{slotLog.status}</p>
                      </div>
                    ) : (
                      <Link
                        href="/dashboard/schedule"
                        className="flex items-center justify-center w-full h-full opacity-0 hover:opacity-100 transition-opacity"
                        title="Add post"
                      >
                        <Plus size={12} style={{ color: 'var(--text-muted)' }} />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* No posts empty state */}
          {!logs?.length && (
            <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posts yet this week.</p>
              <Link
                href="/dashboard/schedule"
                className="text-sm font-semibold mt-2 inline-block hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Create your first schedule →
              </Link>
            </div>
          )}
        </div>

        {/* Right column: Quick Actions + extras */}
        <div className="space-y-4">

          {/* Quick Actions card */}
          <div
            className="rounded-2xl p-4 sm:p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h2 className="font-semibold text-sm mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { href: '/dashboard/create',   icon: Sparkles,   title: 'AI Caption Studio',  sub: 'Generate captions with AI' },
                { href: '/dashboard/calendar',  icon: Calendar,   title: 'Content Calendar',   sub: 'Plan your content' },
                { href: '/dashboard/posts',     icon: LayoutGrid, title: 'Post History',       sub: 'View all posts' },
              ].map(({ href, icon: Icon, title, sub }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] group"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-subtle)' }}
                  >
                    <Icon size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Connect CTA — only if no IG accounts */}
          {!accounts?.length && (
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,77,77,0.12) 0%, rgba(255,77,77,0.05) 100%)',
                border: '1px solid rgba(255,77,77,0.22)',
              }}
            >
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                Connect Instagram
              </h3>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Link your Instagram Business account to start publishing automatically.
              </p>
              <Link
                href="/dashboard/connect"
                className="block text-center py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                Connect account
              </Link>
            </div>
          )}

          {/* Recent posts mini-list */}
          {logs && logs.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h3 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Recent Posts
                </h3>
                <Link
                  href="/dashboard/posts"
                  className="text-[11px] font-semibold hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  View all
                </Link>
              </div>
              {logs.slice(0, 4).map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < 3 ? '1px solid var(--border)' : undefined }}
                >
                  <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--border)' }}>
                    {log.image_url
                      ? <img src={log.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-4 h-4 rounded" style={{ background: 'var(--text-muted)', opacity: 0.2 }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                      {log.caption?.slice(0, 30) || 'Generating…'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
