export const runtime = 'edge'

import { requireAdminServer } from '@/lib/admin'
import AdminSettingsClient from './SettingsClient'

export default async function AdminSettings() {
  const { service } = await requireAdminServer()

  const [{ data: settings }, { data: packs }] = await Promise.all([
    service.from('app_settings').select('*').eq('id', 1).single(),
    service.from('credit_packs').select('*').order('sort_order', { ascending: true }),
  ])

  const s = settings ?? {
    default_trial_days: 7, default_image_provider: 'pexels', cron_frequency: 'every 5 min',
    maintenance_mode: false, announcement_banner: '',
  }

  return <AdminSettingsClient settings={s} packs={packs ?? []} />
}
