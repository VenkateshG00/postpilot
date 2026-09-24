'use client'

import { Instagram, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import type { SocialAccount } from '@/types'


function getMetaOAuthURL() {
  return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1745129453437379&redirect_uri=https://postpilot-1ia.pages.dev/api/meta/callback&response_type=code&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments`
}

export default function ConnectPageClient({ accounts, eligible }: { accounts: SocialAccount[]; eligible: boolean }) {
  const [approval, setApproval] = useState<Record<string, boolean>>(Object.fromEntries(accounts.map(a => [a.id, !!(a as any).require_approval])))
  async function toggleApproval(id: string, val: boolean) {
    setApproval(prev => ({ ...prev, [id]: val }))
    try {
      const res = await fetch('/api/accounts/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: id, require_approval: val }) })
      if (!res.ok) throw new Error()
    } catch { setApproval(prev => ({ ...prev, [id]: !val })) }
  }
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlSuccess, setUrlSuccess] = useState(false)

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
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Connected accounts</h1>
        <p className="text-sm text-gray-500">Manage the Instagram and Facebook accounts PostPilot posts to.</p>
      </div>

      {urlError && (
        <div className="card p-4 border-red-200 bg-red-50 mb-4">
          <p className="text-xs font-medium text-red-800 mb-1">Connection error:</p>
          <p className="text-sm text-red-700 font-mono break-all">{urlError}</p>
        </div>
      )}

      {urlSuccess && (
        <div className="card p-4 border-emerald-200 bg-emerald-50 mb-4">
          <p className="text-sm text-emerald-700 font-medium">✅ Instagram account connected successfully!</p>
        </div>
      )}

      {/* Connect button */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shrink-0">
            <Instagram size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Instagram Business</h3>
            <p className="text-sm text-gray-500">Connect via Instagram login to enable auto-publishing.</p>
          </div>
          <button onClick={connectInstagram} disabled={loading} className="btn-primary shrink-0">
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <Instagram size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No accounts connected yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Connect" above to link your Instagram Business account.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Your accounts</h2>
          {accounts.map(account => (
            <div key={account.id} className="card p-5 flex items-center gap-4">
              {account.account_picture_url
                ? <img src={account.account_picture_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                  {account.account_name?.[0]?.toUpperCase() ?? 'I'}
                </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">@{account.account_name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{account.platform}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {account.is_active
                    ? <CheckCircle2 size={11} className="text-emerald-500" />
                    : <AlertCircle size={11} className="text-red-400" />
                  }
                  <span className="text-xs text-gray-400">
                    {account.is_active ? 'Active' : 'Inactive'} · Connected {formatDate(account.connected_at)}
                  </span>
                </div>
                {tokenExpiringSoon(account) && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Token expires soon — reconnect to avoid interruptions</p>
                )}
              </div>
              {eligible && (
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap" title="Hold posts for your review before publishing">
                  <input type="checkbox" checked={approval[account.id] ?? false} onChange={e => toggleApproval(account.id, e.target.checked)} />
                  Require approval
                </label>
              )}
              <button onClick={connectInstagram} title="Refresh token" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                <RefreshCw size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <p className="text-xs font-medium text-amber-800 mb-1">Requires Instagram Business account</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          PostPilot publishes via the Meta Graph API. Your Instagram must be a Business or Creator account.
          <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noreferrer" className="underline ml-1">How to convert →</a>
        </p>
      </div>
    </div>
  )
}


// 'use client'

// import { Instagram, Plus, CheckCircle2, AlertCircle, Trash2, RefreshCw } from 'lucide-react'
// import { useState } from 'react'
// import { formatDate } from '@/lib/utils'
// import type { SocialAccount } from '@/types'

// function getMetaOAuthURL() {
//   return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1745129453437379&redirect_uri=https://postpilot-1ia.pages.dev/api/meta/callback&response_type=code&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments`
// }

// export default function ConnectPageClient({ accounts }: { accounts: SocialAccount[] }) {
//   const [loading, setLoading] = useState(false)

//   function connectInstagram() {
//     setLoading(true)
//     window.location.href = getMetaOAuthURL()
//   }

//   const tokenExpiringSoon = (account: SocialAccount) => {
//     if (!account.token_expires_at) return false
//     const daysLeft = (new Date(account.token_expires_at).getTime() - Date.now()) / 86400000
//     return daysLeft < 10
//   }

//   return (
//     <div className="p-8 max-w-2xl">
//       <div className="mb-8">
//         <h1 className="text-2xl font-semibold text-gray-900 mb-1">Connected accounts</h1>
//         <p className="text-sm text-gray-500">Manage the Instagram and Facebook accounts PostPilot posts to.</p>
//       </div>

//       {/* Connect button */}
//       <div className="card p-6 mb-6">
//         <div className="flex items-center gap-4">
//           <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shrink-0">
//             <Instagram size={22} className="text-white" />
//           </div>
//           <div className="flex-1">
//             <h3 className="font-medium text-gray-900">Instagram Business</h3>
//             <p className="text-sm text-gray-500">Connect via Facebook login to enable auto-publishing.</p>
//           </div>
//           <button
//             onClick={connectInstagram}
//             disabled={loading}
//             className="btn-primary shrink-0"
//           >
//             <Plus size={14} /> Connect
//           </button>
//         </div>
//       </div>

//       {/* Connected accounts */}
//       {accounts.length === 0 ? (
//         <div className="card p-10 text-center">
//           <Instagram size={32} className="text-gray-300 mx-auto mb-3" />
//           <p className="text-sm text-gray-500">No accounts connected yet.</p>
//           <p className="text-xs text-gray-400 mt-1">Click "Connect" above to link your Instagram Business account.</p>
//         </div>
//       ) : (
//         <div className="space-y-3">
//           <h2 className="text-sm font-medium text-gray-700 mb-3">Your accounts</h2>
//           {accounts.map(account => (
//             <div key={account.id} className="card p-5 flex items-center gap-4">
//               {account.account_picture_url
//                 ? <img src={account.account_picture_url} alt="" className="w-10 h-10 rounded-full object-cover" />
//                 : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
//                   {account.account_name?.[0]?.toUpperCase() ?? 'I'}
//                 </div>
//               }
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-2">
//                   <span className="font-medium text-sm text-gray-900">@{account.account_name}</span>
//                   <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
//                     {account.platform}
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-1.5 mt-0.5">
//                   {account.is_active
//                     ? <CheckCircle2 size={11} className="text-emerald-500" />
//                     : <AlertCircle size={11} className="text-red-400" />
//                   }
//                   <span className="text-xs text-gray-400">
//                     {account.is_active ? 'Active' : 'Inactive'} · Connected {formatDate(account.connected_at)}
//                   </span>
//                 </div>
//                 {tokenExpiringSoon(account) && (
//                   <p className="text-xs text-amber-600 mt-1">⚠ Token expires soon — reconnect to avoid interruptions</p>
//                 )}
//               </div>
//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={connectInstagram}
//                   title="Refresh token"
//                   className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
//                 >
//                   <RefreshCw size={14} />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Help */}
//       <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl">
//         <p className="text-xs font-medium text-amber-800 mb-1">Requires Instagram Business account</p>
//         <p className="text-xs text-amber-700 leading-relaxed">
//           PostPilot publishes via the Meta Graph API. Your Instagram must be a Business or Creator account
//           linked to a Facebook Page. Personal accounts are not supported.
//           <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noreferrer" className="underline ml-1">
//             How to convert →
//           </a>
//         </p>
//       </div>
//     </div>
//   )
// }
