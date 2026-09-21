export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'
import PostsClient from './PostsClient'

export default async function AdminPosts() {
  const { service } = await requireAdminServer()

  const [{ data: posts }, { data: profiles }] = await Promise.all([
    service.from('post_logs')
      .select('id, user_id, platform, status, caption, topic_used, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('profiles').select('id, email'),
  ])

  const emailByUser: Record<string, string> = {}
  ;(profiles ?? []).forEach((p: any) => { emailByUser[p.id] = p.email })

  const rows = (posts ?? []).map((p: any) => ({
    id: p.id,
    email: emailByUser[p.user_id] ?? '—',
    platform: p.platform,
    status: p.status,
    caption: p.caption,
    topic_used: p.topic_used,
    error_message: p.error_message,
    created_at: p.created_at,
  }))

  return <PostsClient posts={rows} />
}
