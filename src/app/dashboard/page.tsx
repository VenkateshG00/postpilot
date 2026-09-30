export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import { Plus, ArrowRight, Sparkles, LayoutGrid, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getActiveAccountId } from '@/lib/active-account'

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  )
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

  const publishedCount = logs?.filter(l => l.status === 'published').length ?? 0
  const failedCount    = logs?.filter(l => l.status === 'failed').length ?? 0
  const pendingCount   = logs?.filter(l => l.status === 'pending').length ?? 0

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
    <div className="p-6 max-w-[1200px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[26px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome back,{' '}
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{displayName}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Here's what's happening with your account today
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-80 shrink-0"
          style={{ background: 'var(--text-primary)' }}
        >
          <Plus size={14} />
          Create post
        </Link>
      </div>

      {/* ── Stats 3×2 ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Schedules"  value={schedules?.length ?? 0} sub="Auto-posting" />
        <StatCard label="Posts Published"   value={publishedCount}         sub="All time" />
        <StatCard label="Accounts Linked"   value={accounts?.length ?? 0}  sub="Instagram &amp; Facebook" />
        <StatCard label="Posts Pending"     value={pendingCount}           sub="In queue" />
        <StatCard label="Posts Failed"      value={failedCount}            sub="Needs attention" />
        <StatCard label="Engagement Rate"   value="—"                      sub="Connect analytics" />
      </div>

      {/* ── Two-column: Calendar + Quick Actions ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Content Calendar (2 cols) */}
        <div
          className="col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Card header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Content Calendar
            </h2>
            <Link
              href="/dashboard/schedule"
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {/* Day headers */}
          <div
            className="grid grid-cols-7 text-center py-2 px-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
              const isToday = weekDays[i]?.toDateString() === today.toDateString()
              return (
                <div key={d} className="py-1 select-none">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{d}</p>
                  <div
                    className="w-7 h-7 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold"
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
                minHeight: 90,
              }}
            >
              {weekDays.map((day, i) => {
                const dayLogs = logsByDate[day.toDateString()] ?? []
                const slotLog = dayLogs[rowIdx]
                const isToday = day.toDateString() === today.toDateString()
                return (
                  <div
                    key={i}
                    className="p-1.5 border-r last:border-r-0"
                    style={{
                      borderColor: 'var(--border)',
                      background: isToday ? 'var(--accent-subtle)' : 'transparent',
                    }}
                  >
                    {slotLog ? (
                      <div
                        className="rounded-lg p-1.5 text-[11px] leading-tight"
                        style={{
                          background: slotLog.status === 'published'
                            ? 'rgba(34,197,94,0.12)'
                            : 'rgba(255,77,77,0.12)',
                          color: slotLog.status === 'published' ? '#16a34a' : 'var(--accent)',
                          border: `1px solid ${slotLog.status === 'published' ? 'rgba(34,197,94,0.2)' : 'rgba(255,77,77,0.2)'}`,
                        }}
                      >
                        <p className="font-semibold truncate">
                          {slotLog.caption?.slice(0, 18) || 'Post'}
                        </p>
                        <p className="opacity-70 mt-0.5">{slotLog.status}</p>
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
            <div className="px-6 py-10 text-center">
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
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { href: '/dashboard/create',   icon: Sparkles,    title: 'AI Caption Studio',  sub: 'Create post' },
                { href: '/dashboard/schedule', icon: Calendar,    title: 'Content Calendar',   sub: 'Schedule' },
                { href: '/dashboard/posts',    icon: LayoutGrid,  title: 'Post History',       sub: 'View all' },
              ].map(({ href, icon: Icon, title, sub }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: 'var(--accent-subtle)' }}
                  >
                    <Icon size={15} style={{ color: 'var(--accent)' }} />
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
              className="rounded-2xl p-5"
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
                  <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                    {log.image_url
                      ? <img src={log.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-4 h-4 rounded" style={{ background: 'var(--border)' }} />
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
