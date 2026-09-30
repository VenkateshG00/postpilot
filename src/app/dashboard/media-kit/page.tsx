export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MediaKitClient from './MediaKitClient'

export default async function MediaKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* Fetch profile + biz */
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: biz } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  /* Fetch accounts */
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, account_name, platform, followers_count, following_count')
    .eq('user_id', user.id)
    .eq('is_active', true)

  /* Fetch post stats for the media kit */
  const { data: posts } = await supabase
    .from('post_logs')
    .select('id, status, content_type, likes, comments, shares, reach, impressions, created_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <MediaKitClient
      profile={profile}
      biz={biz}
      accounts={accounts ?? []}
      posts={posts ?? []}
    />
  )
}
