export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import MediaKitClient from '@/app/dashboard/media-kit/MediaKitClient'

export default async function PublicMediaKit({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Media kit not found</p>
      </div>
    )
  }

  const { data: biz } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, account_name, platform')
    .eq('user_id', userId)
    .eq('is_active', true)

  const { data: posts } = await supabase
    .from('post_logs')
    .select('id, status, caption, image_url, likes_count, comments_count, reach, impressions, created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  const mappedPosts = (posts ?? []).map(p => ({
    id: p.id,
    status: p.status,
    content_type: 'post',
    likes: p.likes_count ?? 0,
    comments: p.comments_count ?? 0,
    shares: 0,
    reach: p.reach ?? 0,
    impressions: p.impressions ?? 0,
    created_at: p.created_at,
  }))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <MediaKitClient
        profile={profile}
        biz={biz}
        accounts={accounts ?? []}
        posts={mappedPosts}
      />
    </div>
  )
}
