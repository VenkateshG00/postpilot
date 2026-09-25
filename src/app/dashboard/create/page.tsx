export const runtime = 'edge'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import CreatePostClient from './CreatePostClient'

export default async function CreatePostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: accounts },
    { data: profile },
  ] = await Promise.all([
    supabase.from('social_accounts').select('id, account_name').eq('user_id', user!.id).eq('is_active', true),
    supabase.from('profiles').select('credits_balance').eq('id', user!.id).maybeSingle(),
  ])

  // Fetch global setting — use service client so RLS never blocks it
  const svc = await createServiceClient()
  const { data: appSettings } = await svc.from('app_settings').select('ai_image_provider').eq('id', 1).maybeSingle()
  const aiImageProvider = appSettings?.ai_image_provider ?? 'none'

  return (
    <CreatePostClient
      accounts={accounts ?? []}
      credits={profile?.credits_balance ?? 0}
      aiImageProvider={aiImageProvider}
    />
  )
}
