export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import CreatePostClient from './CreatePostClient'

export default async function CreatePostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: accounts } = await supabase.from('social_accounts')
    .select('id, account_name').eq('user_id', user!.id).eq('is_active', true)
  const { data: profile } = await supabase.from('profiles')
    .select('credits_balance').eq('id', user!.id).maybeSingle()
  return <CreatePostClient accounts={accounts ?? []} credits={profile?.credits_balance ?? 0} />
}
