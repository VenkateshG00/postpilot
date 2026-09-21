import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Guard an admin server page: redirects non-admins, returns a service client
// (bypasses RLS) so admin pages can read across all users' data.
export async function requireAdminServer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')
  const service = await createServiceClient()
  return { user, profile, service }
}
