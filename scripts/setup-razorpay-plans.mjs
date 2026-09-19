// One-time: creates the 3 Razorpay subscription plans and prints the env lines.
//
//   1. Put RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test mode) in .env.local
//   2. Run:  node --env-file=.env.local scripts/setup-razorpay-plans.mjs
//   3. Paste the printed RAZORPAY_PLAN_* lines back into .env.local
//
// Amounts are in paise (₹1 = 100 paise).

const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

if (!KEY_ID || !KEY_SECRET || KEY_ID.includes('your-key')) {
  console.error('❌ Set real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local first.')
  process.exit(1)
}

const auth = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')

const PLANS = [
  { env: 'RAZORPAY_PLAN_STARTER', name: 'PostPilot Starter', amount: 49900 },   // ₹499
  { env: 'RAZORPAY_PLAN_PRO',     name: 'PostPilot Pro',     amount: 149900 },  // ₹1,499
  { env: 'RAZORPAY_PLAN_AGENCY',  name: 'PostPilot Agency',  amount: 499900 },  // ₹4,999
]

const out = []
for (const p of PLANS) {
  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      period: 'monthly',
      interval: 1,
      item: { name: p.name, amount: p.amount, currency: 'INR' },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`❌ Failed to create ${p.name}:`, JSON.stringify(data))
    process.exit(1)
  }
  console.log(`✅ ${p.name} → ${data.id}`)
  out.push(`${p.env}=${data.id}`)
}

console.log('\n👉 Paste these into your .env.local:\n')
console.log(out.join('\n') + '\n')
