'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Coins, Zap } from 'lucide-react'

interface Pack { name: string; credits: number; price_inr: number }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as any).Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

export default function CreditsClient({
  packs,
  balance,
  monthly,
}: {
  packs: Pack[]
  balance: number
  monthly: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buy(pack: Pack) {
    setError(null)
    setLoading(pack.name)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Could not load Razorpay checkout — check your connection')

      const res = await fetch('/api/razorpay/credits/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: pack.name }),
      })
      const data = await res.json()
      if (!res.ok || !data.orderId) throw new Error(data.error || 'Could not start checkout')

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'PostPilot',
        description: `${pack.credits} credits`,
        theme: { color: '#FF4D4D' },
        handler: async (resp: any) => {
          try {
            const v = await fetch('/api/razorpay/credits/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            })
            if (!v.ok) { const e = await v.json(); throw new Error(e.error || 'Verification failed') }
            setBanner(`Added ${pack.credits} credits to your balance.`)
            setTimeout(() => router.refresh(), 1500)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed')
          }
          setLoading(null)
        },
        modal: { ondismiss: () => setLoading(null) },
      })
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Credits</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Buy extra credits for regenerations and AI images. Purchased credits never expire.
        </p>
      </div>

      {/* Success banner */}
      {banner && (
        <div
          className="rounded-2xl px-4 py-3 mb-5 text-sm"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
        >
          {banner}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="rounded-2xl px-4 py-3 mb-5 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl p-5 mb-6 flex items-center gap-4" style={cardStyle}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,77,77,0.1)' }}
        >
          <Coins size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {balance}{' '}
            <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>credits available</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {monthly}/month included in your plan · top-ups never expire
          </p>
        </div>
      </div>

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {packs.map(p => (
          <div key={p.name} className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(255,77,77,0.1)' }}
            >
              <Zap size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {p.credits} credits
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              ₹{p.price_inr.toLocaleString('en-IN')}
            </p>
            <button
              onClick={() => buy(p)}
              disabled={loading === p.name}
              className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--accent)' }}
            >
              {loading === p.name && <Loader2 size={14} className="animate-spin" />}
              Buy
            </button>
          </div>
        ))}
        {packs.length === 0 && (
          <p className="text-sm col-span-3" style={{ color: 'var(--text-muted)' }}>
            No credit packs available.
          </p>
        )}
      </div>
    </div>
  )
}
