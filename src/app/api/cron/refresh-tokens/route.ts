export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON_SECRET = process.env.CRON_SECRET!

const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
}

// Renews Instagram long-lived tokens before they expire.
// IG long-lived tokens last ~60 days; refreshing extends them another ~60.
// A token must be >24h old to refresh — always true here, since we only touch
// tokens already within 15 days of expiry (i.e. ~45+ days old).
export async function GET(request: NextRequest) {
    if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cutoff = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()

    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/social_accounts?platform=eq.instagram&is_active=eq.true` +
        `&token_expires_at=lt.${encodeURIComponent(cutoff)}` +
        `&select=id,account_name,access_token,token_expires_at`,
        { headers: sbHeaders }
    )
    const accounts: any[] = await res.json()

    const results: any[] = []

    for (const acct of accounts ?? []) {
        try {
            const r = await fetch(
                `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${acct.access_token}`
            )
            const data = await r.json()

            if (data.access_token) {
                const newExpiry = new Date(Date.now() + (data.expires_in ?? 5183944) * 1000).toISOString()
                await fetch(`${SUPABASE_URL}/rest/v1/social_accounts?id=eq.${acct.id}`, {
                    method: 'PATCH',
                    headers: { ...sbHeaders, Prefer: 'return=minimal' },
                    body: JSON.stringify({ access_token: data.access_token, token_expires_at: newExpiry }),
                })
                results.push({ account: acct.account_name, status: 'refreshed', expires: newExpiry })
            } else {
                // Token likely already expired or revoked -> the account must reconnect.
                results.push({ account: acct.account_name, status: 'failed', error: data.error?.message || 'no token returned' })
            }
        } catch (e: any) {
            results.push({ account: acct.account_name, status: 'error', error: e?.message || String(e) })
        }
    }

    return NextResponse.json({
        checked: accounts?.length ?? 0,
        refreshed: results.filter(r => r.status === 'refreshed').length,
        results,
    })
}
