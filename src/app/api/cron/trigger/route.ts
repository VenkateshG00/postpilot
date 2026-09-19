export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL!
const CRON_SECRET = process.env.CRON_SECRET!

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()
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
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                },
                body: JSON.stringify({ p_current_time, p_current_day })
            }
        )

        const schedules = await res.json()

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ message: 'No schedules due', time: p_current_time, triggered: 0 })
        }

        const results = await Promise.allSettled(
            schedules.map(async (schedule: any) => {
                // Create post log
                const logRes = await fetch(`${SUPABASE_URL}/rest/v1/post_logs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: schedule.user_id,
                        schedule_id: schedule.schedule_id,
                        social_account_id: schedule.social_account_id,
                        platform: 'instagram',
                        status: 'pending',
                        scheduled_for: new Date().toISOString()
                    })
                })
                const logData = await logRes.json()
                const logId = logData[0]?.id

                // Fire n8n webhook
                const n8nRes = await fetch(N8N_WEBHOOK_BASE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        post_log_id: logId,
                        user_id: schedule.user_id,
                        business_name: schedule.business_name,
                        industry: schedule.industry,
                        description: schedule.description,
                        target_audience: schedule.target_audience,
                        brand_voice: schedule.brand_voice,
                        topics: schedule.topics,
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

                return { schedule_id: schedule.schedule_id, log_id: logId, n8n_status: n8nRes.status }
            })
        )

        return NextResponse.json({ message: 'Cron executed', time: p_current_time, triggered: schedules.length, results })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}