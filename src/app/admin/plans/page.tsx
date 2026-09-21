export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import PlansEditorClient from './PlansEditorClient'

// Auth + admin check is handled by src/app/admin/layout.tsx.
export default async function AdminPlansPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })

  return <PlansEditorClient initialPlans={plans ?? []} />
}
