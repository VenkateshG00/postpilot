'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles, AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
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
        theme: { color: '#FF4D4D' },
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
  const usagePct = props.dailyLimit
    ? Math.min(100, Math.round((props.postsToday / props.dailyLimit) * 100))
    : 0

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Billing &amp; plans</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Upgrade your plan and see your usage</p>
      </div>

      {/* Banners */}
      {banner && (
        <div className="mb-6 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={15} color="#22c55e" />
          <span className="text-sm font-medium" style={{ color: '#22c55e' }}>{banner}</span>
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={15} color="#ef4444" />
          <span className="text-sm font-medium" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {/* Current plan + usage */}
      <div className="rounded-2xl p-4 sm:p-6 mb-8" style={cardStyle}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span
              className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2"
              style={{ background: 'rgba(255,77,77,0.12)', color: 'var(--accent)' }}
            >
              Current plan
            </span>
            <h2 className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
              {props.currentPlan}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{props.currentLimitLabel} posting limit</p>
            {props.planExpiresAt && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                Access valid until {formatDate(props.planExpiresAt)}
              </p>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,77,77,0.12)' }}
          >
            <Zap size={20} style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-sm mb-2">
            <span style={{ color: 'var(--text-muted)' }}>Posts today</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {props.postsToday}{props.dailyLimit ? ` / ${props.dailyLimit}` : ' (unlimited)'}
            </span>
          </div>
          {props.dailyLimit && (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usagePct}%`,
                  background: usagePct >= 100 ? '#ef4444' : 'var(--accent)',
                }}
              />
            </div>
          )}
        </div>

        {/* Credits */}
        <div className="mt-5 pt-5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--text-muted)' }}>AI Credits</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {props.creditsBalance}
              {props.creditsMonthly ? ` / ${props.creditsMonthly} included` : ''}
            </span>
          </div>
          <a
            href="/dashboard/credits"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Add credits →
          </a>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {props.plans.map((p) => {
          const isCurrent = p.key === props.currentPlan
          const rank = RANK[p.key] ?? 0
          const isDowngrade = rank < currentRank

          return (
            <div
              key={p.key}
              className="rounded-2xl p-5 flex flex-col"
              style={{
                background: 'var(--bg-card)',
                border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isCurrent ? '0 0 0 4px rgba(255,77,77,0.08)' : 'none',
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.label}</h3>
                {p.key === 'pro' && <Sparkles size={13} style={{ color: 'var(--accent)' }} />}
                {isCurrent && (
                  <span
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,77,77,0.12)', color: 'var(--accent)' }}
                  >
                    Active
                  </span>
                )}
              </div>

              <div className="mb-1">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {p.priceInr === 0 ? 'Free' : `₹${p.priceInr.toLocaleString('en-IN')}`}
                </span>
                {p.priceInr > 0 && (
                  <span className="text-sm ml-0.5" style={{ color: 'var(--text-muted)' }}>/mo</span>
                )}
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{p.limitLabel}</p>

              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Check size={13} color="#22c55e" className="shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-bold opacity-60 cursor-default"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  Current plan
                </button>
              ) : p.key === 'free' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-bold opacity-40 cursor-default"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  —
                </button>
              ) : (
                <button
                  onClick={() => buy(p.key)}
                  disabled={loadingPlan !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={
                    isDowngrade
                      ? { background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                      : { background: 'var(--accent)', color: '#fff' }
                  }
                >
                  {loadingPlan === p.key && <Loader2 size={14} className="animate-spin" />}
                  {isDowngrade ? 'Switch' : 'Upgrade'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-6" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
        Payments are processed securely by Razorpay. Each payment gives 30 days of access; renew from here to extend.
      </p>
    </div>
  )
}
