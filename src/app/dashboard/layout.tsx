export const runtime = 'edge'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { getPlan } from '@/lib/plans-db'
import { getActiveAccountId } from '@/lib/active-account'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, account_name, platform')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('connected_at', { ascending: true })

  /* Fetch workspaces (owned + member-of) */
  const { data: ownedWs } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
  const { data: memberWs } = await supabase
    .from('team_members')
    .select('workspace_id')
    .eq('email', user.email ?? '')
    .eq('status', 'accepted')
  const memberWsIds = (memberWs ?? []).map(m => m.workspace_id)
  let joinedWs: any[] = []
  if (memberWsIds.length > 0) {
    const { data } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .in('id', memberWsIds)
    joinedWs = data ?? []
  }
  const allWorkspaces = [...(ownedWs ?? []), ...joinedWs]

  const activeAccountId = await getActiveAccountId((accounts ?? []).map(a => a.id))

  return (
    <div
      className="md:grid h-screen overflow-hidden"
      style={{
        background: 'var(--bg)',
        gridTemplateColumns: '72px 1fr',
      }}
    >
      {/* Desktop sidebar — 72px icon rail */}
      <div className="hidden md:block">
        <Sidebar
          profile={profile}
          brand={brand}
          accounts={accounts ?? []}
          activeAccountId={activeAccountId}
          workspaces={allWorkspaces}
        />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        profile={profile}
        brand={brand}
        accounts={accounts ?? []}
        activeAccountId={activeAccountId}
      />

      {/* Main content — full width, no max-w constraint */}
      <main className="flex-1 overflow-y-auto" style={{ padding: '24px 20px 40px' }}>
        {children}
      </main>
    </div>
  )
}
