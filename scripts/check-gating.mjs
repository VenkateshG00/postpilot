// node --env-file=.env.local scripts/check-gating.mjs
// Verifies the plan-gating math against LIVE data. Creates no posts, fires no webhooks.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const LIMITS = { free: 1, starter: 3, pro: 10, agency: Infinity }

// Recently active profiles (yours will be at the top).
const profiles = await (await fetch(`${URL}/rest/v1/profiles?select=id,email,plan,plan_expires_at&order=updated_at.desc&limit=3`, { headers: h })).json()

for (const p of profiles) {
  const usage = await (await fetch(`${URL}/rest/v1/rpc/posts_today`, { method: 'POST', headers: h, body: JSON.stringify({ p_user_id: p.id }) })).json()
  const used = typeof usage === 'number' ? usage : 0

  const expired = p.plan !== 'free' && p.plan_expires_at && new Date(p.plan_expires_at) < new Date()
  const effective = expired ? 'free' : p.plan
  const limit = LIMITS[effective] ?? 1

  console.log(`\n${p.email}`)
  console.log(`  plan: ${p.plan}${expired ? ' (EXPIRED -> free)' : ''}  effective: ${effective}`)
  console.log(`  daily limit: ${limit === Infinity ? 'unlimited' : limit}   posts today (IST): ${used}`)
  console.log(`  next post: ${used >= limit ? 'BLOCKED (plan_limit_reached)' : 'ALLOWED'}`)
  if (limit !== Infinity) {
    console.log(`  gate check: at ${limit} posts today -> BLOCKED, at ${limit - 1} -> ALLOWED`)
  }
}
