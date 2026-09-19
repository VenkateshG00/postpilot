// Edge-safe Razorpay REST helpers. The official SDK is Node-only, so on the
// Cloudflare Pages runtime we call the REST API with fetch and verify
// signatures with Web Crypto (crypto.subtle) — both edge-native.

const RAZORPAY_API = 'https://api.razorpay.com/v1'

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set')
  return 'Basic ' + btoa(`${id}:${secret}`)
}

export async function rzpFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) console.log(`[rzp] ${init?.method || 'GET'} ${path} -> ${res.status} ${text.slice(0, 200)}`)
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Razorpay returned non-JSON (${res.status}): ${text.slice(0, 200) || '<empty>'}`)
  }
  if (!res.ok) {
    throw new Error(data?.error?.description || (typeof data?.error === 'string' ? data.error : `Razorpay request failed (${res.status})`))
  }
  return data
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

// Checkout signature for an Order payment: HMAC(order_id + '|' + payment_id).
export async function verifyPaymentSignature(
  orderId: string, paymentId: string, signature: string,
): Promise<boolean> {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET is not set')
  const expected = await hmacHex(`${orderId}|${paymentId}`, secret)
  return safeEqual(expected, signature)
}

// Webhook signature: HMAC(rawBody) with the webhook secret, vs X-Razorpay-Signature.
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET is not set')
  const expected = await hmacHex(rawBody, secret)
  return safeEqual(expected, signature)
}
