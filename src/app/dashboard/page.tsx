export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import { BarChart3, Clock, CheckCircle2, AlertCircle, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getActiveAccountId } from '@/lib/active-account'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase.from('social_accounts').select('*').eq('user_id', user!.id).eq('is_active', true)
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
  const failedCount = logs?.filter(l => l.status === 'failed').length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Good {getGreeting()}, {biz?.business_name ?? 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your social posts</p>
        </div>
        <Link href="/dashboard/schedule" className="btn-primary">
          <Plus size={14} /> New schedule
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active schedules', value: schedules?.length ?? 0, icon: Clock, color: 'text-brand-600 bg-brand-50' },
          { label: 'Posts published', value: publishedCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Accounts linked', value: accounts?.length ?? 0, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
          { label: 'Posts failed', value: failedCount, icon: AlertCircle, color: 'text-red-600 bg-red-50' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent posts */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900 text-sm">Recent posts</h2>
            <Link href="/dashboard/posts" className="text-xs text-brand-600 flex items-center gap-1 hover:underline">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!logs?.length && (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-400">No posts yet.</p>
                <Link href="/dashboard/schedule" className="text-sm text-brand-600 hover:underline mt-1 inline-block">
                  Create your first schedule →
                </Link>
              </div>
            )}
            {logs?.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-6 py-3.5">
                {log.image_url
                  ? <img src={log.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                  : <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.caption || 'Generating…'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(log.status)}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          {/* Connect account CTA */}
          {!accounts?.length && (
            <div className="card p-6 border-brand-200 bg-brand-50">
              <h3 className="font-medium text-brand-900 mb-1">Connect Instagram</h3>
              <p className="text-sm text-brand-700 mb-4">
                Link your Instagram Business account to start publishing posts automatically.
              </p>
              <Link href="/dashboard/connect" className="btn-primary text-sm">
                Connect account <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Schedule CTA */}
          {!schedules?.length && (
            <div className="card p-6">
              <h3 className="font-medium text-gray-900 mb-1">Set your posting schedule</h3>
              <p className="text-sm text-gray-500 mb-4">
                Tell PostPilot when to post and we'll handle the rest — every day, on time.
              </p>
              <Link href="/dashboard/schedule" className="btn-secondary text-sm">
                Create schedule <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Business profile summary */}
          {biz && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 text-sm">Business profile</h3>
                <Link href="/dashboard/settings" className="text-xs text-brand-600 hover:underline">Edit</Link>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-24">Industry</span>
                  <span className="text-xs text-gray-700">{biz.industry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-24">Brand voice</span>
                  <span className="text-xs text-gray-700 capitalize">{biz.brand_voice}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-24">Topics</span>
                  <span className="text-xs text-gray-700">{biz.topics?.slice(0, 3).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-24">Language</span>
                  <span className="text-xs text-gray-700 uppercase">{biz.language}</span>
                </div>
              </div>
            </div>
          )}
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
