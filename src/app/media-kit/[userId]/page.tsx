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

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <MediaKitClient
        profile={profile}
        biz={biz}
      />
    </div>
  )
}
