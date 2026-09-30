export const runtime = 'edge'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import ReelsClient from './ReelsClient'

export default async function ReelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: accounts },
    { data: profile },
  ] = await Promise.all([
    supabase.from('social_accounts').select('id, account_name').eq('user_id', user!.id).eq('is_active', true),
    supabase.from('profiles').select('credits_balance').eq('id', user!.id).maybeSingle(),
  ])

  const svc = await createServiceClient()
  const { data: appSettings } = await svc
    .from('app_settings')
    .select('ai_active_provider, ai_provider_credits')
    .eq('id', 1)
    .maybeSingle()

  const aiProvider = appSettings?.ai_active_provider ?? 'none'
  const creditsMap: Record<string, number> = appSettings?.ai_provider_credits ?? {}
  const defaultCosts: Record<string, number> = {
    replicate_flux: 4, gemini_flash: 2, huggingface_flux: 3, cloudflare_sdxl: 2, pollinations: 1,
  }
  const aiImageCredits = creditsMap[aiProvider] ?? defaultCosts[aiProvider] ?? 4

  return (
    <ReelsClient
      accounts={accounts ?? []}
      credits={profile?.credits_balance ?? 0}
      aiImageProvider={aiProvider}
      aiImageCredits={aiImageCredits}
    />
  )
}
