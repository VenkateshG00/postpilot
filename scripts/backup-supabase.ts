// Run with: npx tsx scripts/backup-supabase.ts
// Downloads all your Supabase data as a JSON backup file

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TABLES = [
  'profiles',
  'business_profiles',
  'social_accounts',
  'post_logs',
  'schedules',
  'plans',
  'billing_events',
  'credit_packs',
  'app_settings',
  'ai-images',
]

async function backup() {
  const data: Record<string, any[]> = {}
  
  for (const table of TABLES) {
    try {
      const { data: rows, error } = await supabase.from(table).select('*')
      if (error) {
        console.warn(`⚠ ${table}: ${error.message}`)
        data[table] = []
      } else {
        data[table] = rows || []
        console.log(`✓ ${table}: ${rows?.length ?? 0} rows`)
      }
    } catch (e: any) {
      console.warn(`⚠ ${table}: ${e.message}`)
      data[table] = []
    }
  }

  const filename = `supabase-backup-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(filename, JSON.stringify(data, null, 2))
  console.log(`\n✅ Backup saved to ${filename}`)
}

backup()
