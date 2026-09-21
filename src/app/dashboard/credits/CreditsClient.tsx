'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Coins } from 'lucide-react'

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

export default function CreditsClient({ packs, balance, monthly }: { packs: Pack[]; balance: number; monthly: number }) {
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
        theme: { color: '#4f46e5' },
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Credits</h1>
        <p className="text-sm text-gray-500 mt-1">Buy extra credits for regenerations and AI images. Purchased credits never expire.</p>
      </div>

      {banner && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">{banner}</div>}
      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
          <Coins className="text-brand-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">
            {balance} <span className="text-sm font-normal text-gray-500">credits available</span>
          </p>
          <p className="text-xs text-gray-500">{monthly}/month included in your plan · top-ups never expire</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map(p => (
          <div key={p.name} className="card p-5 flex flex-col">
            <p className="text-lg font-semibold text-gray-900">{p.credits} credits</p>
            <p className="text-sm text-gray-500 mb-4">₹{p.price_inr}</p>
            <button onClick={() => buy(p)} disabled={loading === p.name}
              className="mt-auto px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 flex items-center justify-center gap-2">
              {loading === p.name && <Loader2 size={14} className="animate-spin" />} Buy
            </button>
          </div>
        ))}
        {packs.length === 0 && <p className="text-sm text-gray-400">No credit packs available.</p>}
      </div>
    </div>
  )
}
