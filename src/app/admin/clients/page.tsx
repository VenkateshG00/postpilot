export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'
import ClientsClient from './ClientsClient'

export default async function AdminClients() {
  const { service } = await requireAdminServer()

  const [{ data: profiles }, { data: bizs }, { data: posts }, { data: plans }] = await Promise.all([
    service.from('profiles')
      .select('id, email, full_name, plan, plan_expires_at, credits_balance, is_suspended, created_at')
      .eq('is_admin', false)
      .order('created_at', { ascending: false }),
    service.from('business_profiles').select('user_id, business_name, topics'),
    service.from('post_logs').select('user_id, status'),
    service.from('plans').select('key').order('sort_order', { ascending: true }),
  ])

  const bizByUser: Record<string, string> = {}
  const topicsByUser: Record<string, string[]> = {}
  ;(bizs ?? []).forEach((b: any) => { bizByUser[b.user_id] = b.business_name; topicsByUser[b.user_id] = b.topics ?? [] })
  const publishedByUser: Record<string, number> = {}
  ;(posts ?? []).forEach((p: any) => { if (p.status === 'published') publishedByUser[p.user_id] = (publishedByUser[p.user_id] ?? 0) + 1 })

  const clients = (profiles ?? []).map((p: any) => ({
    id: p.id,
    email: p.email,
    business_name: bizByUser[p.id] ?? p.full_name ?? '—',
    plan: p.plan,
    plan_expires_at: p.plan_expires_at,
    credits_balance: p.credits_balance ?? 0,
    is_suspended: p.is_suspended ?? false,
    created_at: p.created_at,
    published: publishedByUser[p.id] ?? 0,
    topics: topicsByUser[p.id] ?? [],
  }))

  const planKeys = (plans ?? []).map((p: any) => p.key as string)
  return <ClientsClient clients={clients} planKeys={planKeys.length ? planKeys : ['free', 'starter', 'pro', 'agency']} />
}
