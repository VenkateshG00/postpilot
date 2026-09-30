export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import {
  BarChart3, Clock, CheckCircle2, AlertCircle,
  ArrowRight, Plus, Instagram, Zap, TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getActiveAccountId } from '@/lib/active-account'

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
    logsQ.order('created_at', { ascending: false }).limit(10),
    schedQ,
  ])

  const publishedCount = logs?.filter(l => l.status === 'published').length ?? 0
  const failedCount    = logs?.filter(l => l.status === 'failed').length ?? 0
  const igConnected    = (accounts?.length ?? 0) > 0

  /* ─── Before Instagram connected — full empty state ─── */
  if (!igConnected) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '40px 24px', textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Instagram size={32} color="var(--accent)" />
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.025em', marginBottom: 12 }}>
          Connect your Instagram
        </h1>
        <p style={{ fontSize: 15, color: 'var(--fg-muted)', maxWidth: 420, lineHeight: 1.65, marginBottom: 32 }}>
          Link your Instagram Business account to start publishing AI-generated posts automatically on your schedule.
        </p>

        {/* CTA */}
        <Link href="/dashboard/connect" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 12,
          background: 'var(--accent)', color: 'white',
          textDecoration: 'none', fontSize: 14, fontWeight: 600,
          transition: 'opacity 0.2s',
        }}>
          <Instagram size={16} />
          Connect Instagram account
          <ArrowRight size={15} />
        </Link>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-subtle)' }}>
          Uses the official Meta API · Your password is never stored
        </p>

        {/* Steps below */}
        <div style={{
          marginTop: 56, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, maxWidth: 680, width: '100%',
        }}>
          {[
            { icon: Instagram, step: '01', title: 'Connect account',    desc: 'Secure OAuth via Meta — one click.' },
            { icon: Zap,       step: '02', title: 'Describe business',  desc: 'Set your tone, topics, and schedule.' },
            { icon: TrendingUp,step: '03', title: 'Posts go live',      desc: 'PostPilot publishes automatically.' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} style={{
              borderRadius: 16, padding: '20px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              textAlign: 'left',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Icon size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 6 }}>{step}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ─── After Instagram connected — full dashboard ─── */
  return (
    <div style={{ padding: '32px 32px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', margin: 0 }}>
            Good {getGreeting()}, {biz?.business_name ?? 'there'} 👋
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>
            Here's what's happening with your posts
          </p>
        </div>
        <Link href="/dashboard/schedule" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 10,
          background: 'var(--accent)', color: 'white',
          textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={14} /> New schedule
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Active schedules', value: schedules?.length ?? 0,  icon: Clock,         accent: 'var(--accent)' },
          { label: 'Posts published',  value: publishedCount,           icon: CheckCircle2,  accent: '#10b981' },
          { label: 'Accounts linked',  value: accounts?.length ?? 0,   icon: BarChart3,      accent: '#8b5cf6' },
          { label: 'Posts failed',     value: failedCount,             icon: AlertCircle,    accent: 'var(--accent)' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} style={{
            borderRadius: 16, padding: '20px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Icon size={16} color={accent} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Recent posts */}
        <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Recent posts</span>
            <Link href="/dashboard/posts" style={{
              fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {!logs?.length ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--fg-subtle)', marginBottom: 12 }}>No posts yet.</p>
              <Link href="/dashboard/schedule" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                Create your first schedule →
              </Link>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {log.image_url
                  ? <img src={log.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-subtle)', flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.caption || 'Generating…'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: '2px 0 0' }}>
                    {formatDate(log.created_at)}
                  </p>
                </div>
                <span className={getStatusColor(log.status)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, flexShrink: 0 }}>
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Schedule status */}
          {!schedules?.length ? (
            <div style={{ borderRadius: 16, padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
                No active schedule
              </h3>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                Set a posting time and PostPilot handles the rest — every day, on time.
              </p>
              <Link href="/dashboard/schedule" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--fg)', textDecoration: 'none',
                fontSize: 12, fontWeight: 500,
              }}>
                Create schedule <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div style={{ borderRadius: 16, padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>Active schedules</h3>
              {schedules.map((s: any) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--fg)' }}>{s.post_time ?? s.cron_expression}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Business profile summary */}
          {biz && (
            <div style={{ borderRadius: 16, padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Business profile</h3>
                <Link href="/dashboard/settings" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>Edit</Link>
              </div>
              {[
                { label: 'Industry',    value: biz.industry },
                { label: 'Brand voice', value: biz.brand_voice },
                { label: 'Topics',      value: biz.topics?.slice(0, 3).join(', ') },
                { label: 'Language',    value: biz.language?.toUpperCase() },
              ].map(({ label, value }) => value ? (
                <div key={label} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)', width: 80, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg)' }}>{value}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Quick links */}
          <div style={{ borderRadius: 16, padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Quick actions</h3>
            {[
              { label: 'Create a post',      href: '/dashboard/create' },
              { label: 'View analytics',     href: '/dashboard/analytics' },
              { label: 'Manage accounts',    href: '/dashboard/connect' },
              { label: 'Billing & plans',    href: '/dashboard/billing' },
            ].map(({ label, href }) => (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                textDecoration: 'none', fontSize: 12, color: 'var(--fg-muted)',
              }}>
                {label}
                <ArrowRight size={11} color="var(--fg-subtle)" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
