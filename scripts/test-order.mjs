// node --env-file=.env.local scripts/test-order.mjs
// Tests Razorpay Order creation from plain Node (undici) with a browser UA,
// exactly the headers our app sends — to see if a real runtime succeeds.
const KID = process.env.RAZORPAY_KEY_ID
const KS = process.env.RAZORPAY_KEY_SECRET
const auth = 'Basic ' + Buffer.from(`${KID}:${KS}`).toString('base64')

const res = await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': auth,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  body: JSON.stringify({ amount: 49900, currency: 'INR', notes: { plan: 'starter' } }),
})
console.log('STATUS:', res.status)
console.log('BODY:', (await res.text()).slice(0, 300))
