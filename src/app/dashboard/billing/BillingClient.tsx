'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface PlanCard {
  key: string
  label: string
  priceInr: number
  limitLabel: string
  features: string[]
}

interface Props {
  plans: PlanCard[]
  currentPlan: string
  currentLimitLabel: string
  dailyLimit: number | null
  postsToday: number
  planExpiresAt: string | null
  creditsBalance: number
  creditsMonthly: number
}

const RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, agency: 3 }

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

export default function BillingClient(props: Props) {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buy(plan: string) {
    setError(null)
    setLoadingPlan(plan)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Could not load Razorpay checkout — check your connection')

      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.orderId) throw new Error(data.error || 'Could not start checkout')

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'PostPilot',
        description: `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan — 1 month`,
        theme: { color: '#4f46e5' },
        handler: async (resp: any) => {
          try {
            const v = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            })
            if (!v.ok) {
              const e = await v.json()
              throw new Error(e.error || 'Verification failed')
            }
            setBanner('Payment successful — your plan is now active.')
            setTimeout(() => router.refresh(), 1500)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed')
          }
          setLoadingPlan(null)
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
      })
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoadingPlan(null)
    }
  }

  const currentRank = RANK[props.currentPlan] ?? 0
  const usagePct = props.dailyLimit ? Math.min(100, Math.round((props.postsToday / props.dailyLimit) * 100)) : 0

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Billing & plans</h1>
        <p className="text-sm text-gray-500 mt-1">Upgrade your plan and see your usage</p>
      </div>

      {banner && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={15} /> {banner}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Current plan + usage */}
      <div className="card p-6 mb-8">
        <div>
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Current plan</span>
          <h2 className="text-xl font-semibold text-gray-900 mt-2 capitalize">{props.currentPlan}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{props.currentLimitLabel} posting limit</p>
          {props.planExpiresAt && (
            <p className="text-xs text-gray-400 mt-1">Access valid until {formatDate(props.planExpiresAt)}</p>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Posts today</span>
            <span className="font-medium text-gray-900">
              {props.postsToday}{props.dailyLimit ? ` / ${props.dailyLimit}` : ' (unlimited)'}
            </span>
          </div>
          {props.dailyLimit && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', usagePct >= 100 ? 'bg-red-500' : 'bg-brand-500')}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Credits</span>
            <span className="font-medium text-gray-900">
              {props.creditsBalance}{props.creditsMonthly ? ` / ${props.creditsMonthly} incl.` : ''}
            </span>
          </div>
          <a href="/dashboard/credits" className="text-sm font-medium text-brand-600 hover:text-brand-700">Add credits →</a>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {props.plans.map((p) => {
          const isCurrent = p.key === props.currentPlan
          const rank = RANK[p.key] ?? 0
          const isDowngrade = rank < currentRank
          return (
            <div
              key={p.key}
              className={cn('card p-5 flex flex-col', isCurrent ? 'border-brand-300 ring-1 ring-brand-200' : 'border-gray-200')}
            >
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-gray-900">{p.label}</h3>
                {p.key === 'pro' && <Sparkles size={13} className="text-brand-500" />}
              </div>
              <div className="mt-2 mb-1">
                <span className="text-2xl font-semibold text-gray-900">
                  {p.priceInr === 0 ? 'Free' : `₹${p.priceInr.toLocaleString('en-IN')}`}
                </span>
                {p.priceInr > 0 && <span className="text-sm text-gray-400">/mo</span>}
              </div>
              <p className="text-xs text-gray-500 mb-4">{p.limitLabel}</p>

              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="btn-secondary w-full justify-center opacity-60 cursor-default">
                  Current plan
                </button>
              ) : p.key === 'free' ? (
                <button disabled className="btn-secondary w-full justify-center opacity-60 cursor-default">
                  —
                </button>
              ) : (
                <button
                  onClick={() => buy(p.key)}
                  disabled={loadingPlan !== null}
                  className={cn('w-full justify-center', isDowngrade ? 'btn-secondary' : 'btn-primary')}
                >
                  {loadingPlan === p.key && <Loader2 size={14} className="animate-spin" />}
                  {isDowngrade ? 'Switch' : 'Upgrade'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Payments are processed securely by Razorpay. Each payment gives 30 days of access; renew from here to extend.
      </p>
    </div>
  )
}
