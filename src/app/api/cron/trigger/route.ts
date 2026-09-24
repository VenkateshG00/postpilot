export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { dailyLimit } from '@/lib/plans-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL!
const CRON_SECRET = process.env.CRON_SECRET!

const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()

        // Reap stale 'pending' posts: anything pending >10 min never got a publisher
        // response (n8n errored, timed out, or never ran) -> mark it failed.
        const staleCutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
        await fetch(
            `${SUPABASE_URL}/rest/v1/post_logs?status=eq.pending&created_at=lt.${encodeURIComponent(staleCutoff)}`,
            {
                method: 'PATCH',
                headers: { ...sbHeaders, Prefer: 'return=minimal' },
                body: JSON.stringify({ status: 'failed', error_message: 'Timed out - no response from publisher' }),
            }
        ).catch(() => {})

        const istOffset = 5.5 * 60 * 60 * 1000
        const ist = new Date(now.getTime() + istOffset)
        const currentHour = ist.getHours().toString().padStart(2, '0')
        const currentMinute = ist.getMinutes().toString().padStart(2, '0')
        const p_current_time = `${currentHour}:${currentMinute}`
        const p_current_day = ist.getDay()

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/get_due_schedules`,
            {
                method: 'POST',
                headers: sbHeaders,
                body: JSON.stringify({ p_current_time, p_current_day })
            }
        )

        const schedules = await res.json()

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ message: 'No schedules due', time: p_current_time, triggered: 0 })
        }

        // --- Plan gating caches (per run) ---------------------------------
        const profileCache: Record<string, { plan: string; expiresAt: string | null; suspended: boolean }> = {}
        const usageCache: Record<string, number> = {}

        const getProfile = async (userId: string) => {
            if (profileCache[userId]) return profileCache[userId]
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan,plan_expires_at,is_suspended`,
                { headers: sbHeaders }
            )
            const rows = await r.json()
            const row = rows?.[0] ?? { plan: 'free', plan_expires_at: null, is_suspended: false }
            profileCache[userId] = { plan: row.plan ?? 'free', expiresAt: row.plan_expires_at ?? null, suspended: row.is_suspended ?? false }
            return profileCache[userId]
        }

        const getUsage = async (userId: string) => {
            if (usageCache[userId] != null) return usageCache[userId]
            const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/posts_today`, {
                method: 'POST',
                headers: sbHeaders,
                body: JSON.stringify({ p_user_id: userId })
            })
            const n = await r.json()
            usageCache[userId] = typeof n === 'number' ? n : 0
            return usageCache[userId]
        }

        // Trial or paid plans stop posting once expired (handled in the loop).
        // Legacy 'free' has no expiry and keeps its allowance.

        const results: any[] = []

        // Sequential so the per-run usage tally is correct when one user has
        // several schedules due in the same minute.
        for (const schedule of schedules) {
            const userId = schedule.user_id
            const { plan, expiresAt, suspended } = await getProfile(userId)
            if (suspended) continue

            // Trial or paid plan lapsed -> stop posting until they subscribe.
            const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now()
            if (plan !== 'free' && isExpired) {
                await fetch(`${SUPABASE_URL}/rest/v1/post_logs`, {
                    method: 'POST',
                    headers: sbHeaders,
                    body: JSON.stringify({
                        user_id: userId,
                        schedule_id: schedule.schedule_id,
                        social_account_id: schedule.social_account_id,
                        platform: 'instagram',
                        status: 'failed',
                        error_message: 'plan_expired',
                        scheduled_for: new Date().toISOString()
                    })
                })
                results.push({ schedule_id: schedule.schedule_id, skipped: 'plan_expired', plan })
                continue
            }

            const limit = await dailyLimit(plan) // Infinity for agency
            const used = await getUsage(userId)

            if (used >= limit) {
                // Over the cap (or expired): record a skipped log, do not fire n8n.
                await fetch(`${SUPABASE_URL}/rest/v1/post_logs`, {
                    method: 'POST',
                    headers: sbHeaders,
                    body: JSON.stringify({
                        user_id: userId,
                        schedule_id: schedule.schedule_id,
                        social_account_id: schedule.social_account_id,
                        platform: 'instagram',
                        status: 'failed',
                        error_message: 'plan_limit_reached',
                        scheduled_for: new Date().toISOString()
                    })
                })
                results.push({
                    schedule_id: schedule.schedule_id,
                    skipped: 'plan_limit_reached',
                    plan,
                    limit: limit === Infinity ? 'unlimited' : limit,
                    used
                })
                continue
            }

            // Create the pending post log.
            const logRes = await fetch(`${SUPABASE_URL}/rest/v1/post_logs`, {
                method: 'POST',
                headers: { ...sbHeaders, 'Prefer': 'return=representation' },
                body: JSON.stringify({
                    user_id: userId,
                    schedule_id: schedule.schedule_id,
                    social_account_id: schedule.social_account_id,
                    platform: 'instagram',
                    status: 'pending',
                    scheduled_for: new Date().toISOString()
                })
            })
            const logData = await logRes.json()
            const logId = logData[0]?.id

            // Count this post toward the cap for the rest of this run.
            usageCache[userId] = used + 1

            // Prefer the schedule's own theme (schedules.topics) over the business default.
            let effectiveTopics = schedule.topics
            try {
                const stRes = await fetch(`${SUPABASE_URL}/rest/v1/schedules?id=eq.${schedule.schedule_id}&select=topics`, { headers: sbHeaders })
                const stRows = await stRes.json()
                const st = stRows?.[0]?.topics
                if (Array.isArray(st) && st.length) effectiveTopics = st
            } catch { /* fall back to business topics */ }

            // Fire the n8n webhook.
            const n8nRes = await fetch(N8N_WEBHOOK_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_log_id: logId,
                    user_id: userId,
                    business_name: schedule.business_name,
                    industry: schedule.industry,
                    description: schedule.description,
                    target_audience: schedule.target_audience,
                    brand_voice: schedule.brand_voice,
                    topics: effectiveTopics,
                    hashtags: schedule.hashtags,
                    language: schedule.language,
                    ig_business_id: schedule.ig_business_id,
                    access_token: schedule.access_token,
                    account_name: schedule.account_name,
                    content_type: schedule.content_type,
                    supabase_url: SUPABASE_URL,
                    supabase_key: SUPABASE_SERVICE_KEY
                })
            })

            results.push({ schedule_id: schedule.schedule_id, log_id: logId, n8n_status: n8nRes.status, plan })
        }

        return NextResponse.json({ message: 'Cron executed', time: p_current_time, triggered: schedules.length, results })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
