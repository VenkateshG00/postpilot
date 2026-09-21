export const runtime = 'edge'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { getPlan } from '@/lib/plans-db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check if onboarding is done
  const { data: bizList } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  const biz = bizList?.[0] ?? null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const plan = await getPlan(profile?.plan ?? 'free')
  const brand = {
    eligible: !!plan.white_label,
    name: profile?.brand_name ?? null,
    logoUrl: profile?.brand_logo_url ?? null,
    color: profile?.brand_color ?? null,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} brand={brand} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
