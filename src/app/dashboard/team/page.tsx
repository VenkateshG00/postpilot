export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* Fetch workspace for this user (owner) */
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  /* Fetch team members if workspace exists */
  let members: any[] = []
  if (workspace) {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('invited_at', { ascending: false })
    members = data || []
  }

  return (
    <TeamClient
      userId={user.id}
      userEmail={user.email || ''}
      workspace={workspace}
      members={members}
    />
  )
}
