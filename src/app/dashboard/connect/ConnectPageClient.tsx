'use client'

import { Instagram, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import type { SocialAccount } from '@/types'

function getMetaOAuthURL() {
  return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1745129453437379&redirect_uri=https://postpilot-1ia.pages.dev/api/meta/callback&response_type=code&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments`
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

export default function ConnectPageClient({ accounts, eligible }: { accounts: SocialAccount[]; eligible: boolean }) {
  const [approval, setApproval] = useState<Record<string, boolean>>(
    Object.fromEntries(accounts.map(a => [a.id, !!(a as any).require_approval]))
  )
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlSuccess, setUrlSuccess] = useState(false)

  async function toggleApproval(id: string, val: boolean) {
    setApproval(prev => ({ ...prev, [id]: val }))
    try {
      const res = await fetch('/api/accounts/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id, require_approval: val }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setApproval(prev => ({ ...prev, [id]: !val }))
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    const success = params.get('success')
    if (err) setUrlError(decodeURIComponent(err))
    if (success) setUrlSuccess(true)
  }, [])

  function connectInstagram() {
    setLoading(true)
    window.location.href = getMetaOAuthURL()
  }

  const tokenExpiringSoon = (account: SocialAccount) => {
    if (!account.token_expires_at) return false
    const daysLeft = (new Date(account.token_expires_at).getTime() - Date.now()) / 86400000
    return daysLeft < 10
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Connected accounts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage the Instagram accounts PostPilot posts to.
        </p>
      </div>

      {/* Error banner */}
      {urlError && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>Connection error:</p>
          <p className="text-sm font-mono break-all" style={{ color: '#ef4444' }}>{urlError}</p>
        </div>
      )}

      {/* Success banner */}
      {urlSuccess && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={14} color="#22c55e" />
          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>Instagram account connected successfully!</p>
        </div>
      )}

      {/* Connect button card */}
      <div className="rounded-2xl p-6 mb-6" style={cardStyle}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCAF45 100%)' }}>
            <Instagram size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Instagram Business</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Connect via Instagram login to enable auto-publishing.
            </p>
          </div>
          <button
            onClick={connectInstagram}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} /> {loading ? 'Redirecting…' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <Instagram size={22} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No accounts connected yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Click "Connect" above to link your Instagram Business account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
            Your accounts
          </h2>
          {accounts.map(account => (
            <div key={account.id} className="rounded-2xl p-4 flex items-center gap-4" style={cardStyle}>
              {/* Avatar */}
              {account.account_picture_url
                ? <img src={account.account_picture_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                : (
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                    {account.account_name?.[0]?.toUpperCase() ?? 'I'}
                  </div>
                )
              }

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    @{account.account_name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    {account.platform}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {account.is_active
                    ? <CheckCircle2 size={11} color="#22c55e" />
                    : <AlertCircle size={11} color="#ef4444" />
                  }
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {account.is_active ? 'Active' : 'Inactive'} · Connected {formatDate(account.connected_at)}
                  </span>
                </div>
                {tokenExpiringSoon(account) && (
                  <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                    ⚠ Token expires soon — reconnect to avoid interruptions
                  </p>
                )}
              </div>

              {/* Approval toggle */}
              {eligible && (
                <label
                  className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  title="Hold posts for your review before publishing"
                >
                  <input
                    type="checkbox"
                    checked={approval[account.id] ?? false}
                    onChange={e => toggleApproval(account.id, e.target.checked)}
                    className="rounded"
                  />
                  Require approval
                </label>
              )}

              {/* Refresh button */}
              <button
                onClick={connectInstagram}
                title="Refresh token"
                className="p-2 rounded-xl transition-colors shrink-0"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info notice */}
      <div
        className="mt-8 rounded-2xl p-4"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Requires Instagram Business account</p>
        <p className="text-xs leading-relaxed" style={{ color: '#f59e0b', opacity: 0.8 }}>
          PostPilot publishes via the Meta Graph API. Your Instagram must be a Business or Creator account.{' '}
          <a
            href="https://help.instagram.com/502981923235522"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            How to convert →
          </a>
        </p>
      </div>
    </div>
  )
}
