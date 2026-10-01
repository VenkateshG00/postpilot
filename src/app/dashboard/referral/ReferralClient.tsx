'use client'

import { useState } from 'react'
import {
  Gift, Users, Copy, CheckCircle2, DollarSign,
  TrendingUp, Clock, UserPlus, ExternalLink, Share2,
  Sparkles, ArrowRight,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────── */
interface Referral {
  id: string
  referrer_id: string
  referred_id: string | null
  referred_email: string
  status: 'pending' | 'signed_up' | 'subscribed' | 'paid_out'
  payout_amount: number
  created_at: string
}

/* ── Helpers ───────────────────────────────────────── */
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'rgba(234,179,8,0.1)',  text: '#eab308', label: 'Pending' },
  signed_up:  { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', label: 'Signed Up' },
  subscribed: { bg: 'rgba(34,197,94,0.1)',  text: '#22c55e', label: 'Subscribed' },
  paid_out:   { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', label: 'Paid Out' },
}

/* ── Component ─────────────────────────────────────── */
export default function ReferralClient({
  userId,
  referrals,
}: {
  userId: string
  referrals: Referral[]
}) {
  const [copied, setCopied] = useState(false)

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?ref=${userId}`

  function copyLink() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  /* Stats */
  const totalReferred = referrals.length
  const signedUp = referrals.filter(r => r.status !== 'pending').length
  const subscribed = referrals.filter(r => r.status === 'subscribed' || r.status === 'paid_out').length
  const totalEarnings = referrals.reduce((s, r) => s + (r.payout_amount ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Referral Program</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Invite friends, earn rewards for every successful referral
        </p>
      </div>

      {/* Referral Link Card */}
      <div className="rounded-2xl p-4 sm:p-6 mb-6" style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', border: 'none' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Gift size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Share & Earn</h2>
            <p className="text-sm text-white/80">Get ₹200 for every friend who subscribes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl text-sm font-mono truncate" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'white', color: 'var(--accent)' }}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2 mt-3">
          {[
            { label: 'Twitter', href: `https://twitter.com/intent/tweet?text=Check%20out%20PostPilot%20for%20AI%20Instagram%20scheduling!%20${encodeURIComponent(referralLink)}` },
            { label: 'WhatsApp', href: `https://wa.me/?text=Check%20out%20PostPilot%20for%20AI%20Instagram%20scheduling!%20${encodeURIComponent(referralLink)}` },
            { label: 'Email', href: `mailto:?subject=Try%20PostPilot&body=Hey!%20Check%20out%20PostPilot%20for%20AI%20Instagram%20scheduling:%20${encodeURIComponent(referralLink)}` },
          ].map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invites',  value: totalReferred.toString(), icon: Users,      color: '#6366f1' },
          { label: 'Signed Up',      value: signedUp.toString(),      icon: UserPlus,   color: '#3b82f6' },
          { label: 'Subscribed',     value: subscribed.toString(),    icon: TrendingUp, color: '#22c55e' },
          { label: 'Total Earnings', value: `₹${totalEarnings}`,     icon: DollarSign,  color: '#eab308' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '15' }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl p-4 sm:p-6 mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '1', icon: Share2,     title: 'Share Link',  desc: 'Share your unique referral link' },
            { step: '2', icon: UserPlus,   title: 'Friend Signs Up', desc: 'They create a PostPilot account' },
            { step: '3', icon: Sparkles,   title: 'They Subscribe',  desc: 'They purchase any paid plan' },
            { step: '4', icon: DollarSign, title: 'You Earn',        desc: 'Get ₹200 credited to your account' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <s.icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Your Referrals</h3>
        </div>

        {referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} className="mx-auto mb-3" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No referrals yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Share your link above to start earning rewards</p>
          </div>
        ) : (
          <div>
            {referrals.map(r => {
              const st = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending
              return (
                <div
                  key={r.id}
                  className="px-6 py-4 flex items-center gap-4"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: st.text }}>
                    {r.referred_email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.referred_email}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Referred {timeAgo(r.created_at)}</p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: st.bg, color: st.text }}
                  >
                    {st.label}
                  </span>
                  {r.payout_amount > 0 && (
                    <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                      +₹{r.payout_amount}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
