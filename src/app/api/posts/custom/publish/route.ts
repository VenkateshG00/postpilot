export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const N8N_PUBLISH_WEBHOOK_URL = process.env.N8N_PUBLISH_WEBHOOK_URL

// ─── Ensure a stable Supabase public URL before posting to Instagram ──────────
async function ensurePublicUrl(
  mediaUrl: string,
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  isVideo = false,
): Promise<string> {
  // Already in our storage — nothing to do
  if (mediaUrl.includes('/storage/v1/object/public/')) return mediaUrl

  let buffer: ArrayBuffer
  let mime: string

  if (mediaUrl.startsWith('data:')) {
    // base64 data URL (HuggingFace / Cloudflare preview)
    const comma = mediaUrl.indexOf(',')
    const header = mediaUrl.slice(0, comma)
    mime = header.split(':')[1]?.split(';')[0] ?? 'image/jpeg'
    const b64 = mediaUrl.slice(comma + 1)
    const binary = atob(b64)
    buffer = new ArrayBuffer(binary.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  } else {
    // External URL (Pollinations, Replicate, etc.)
    const r = await fetch(mediaUrl)
    if (!r.ok) throw new Error(`Failed to fetch media for upload: ${r.status}`)
    buffer = await r.arrayBuffer()
    mime = r.headers.get('content-type')?.split(';')[0] ?? (isVideo ? 'video/mp4' : 'image/jpeg')
  }

  const ext = isVideo
    ? (mime.includes('quicktime') ? 'mov' : 'mp4')
    : (mime === 'image/png' ? 'png' : 'jpg')
  const folder = isVideo ? 'published/videos' : 'published'
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await svc.storage.from('ai-images').upload(filename, buffer, {
    contentType: mime, upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: { publicUrl } } = svc.storage.from('ai-images').getPublicUrl(filename)
  return publicUrl
}

// Publishes a ready one-off post/reel/story via the n8n webhook.
export async function POST(req: NextRequest) {
  if (!N8N_PUBLISH_WEBHOOK_URL) return NextResponse.json({ error: 'Publishing is not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const accountId = String(body.account_id ?? '')
  const caption = String(body.caption ?? '')
  const media_url = String(body.image_url ?? body.media_url ?? '')
  const topic = String(body.topic ?? 'Custom post')
  const content_type = ['post', 'reel', 'story', 'carousel'].includes(body.content_type) ? body.content_type : 'post'
  const scheduledFor = body.scheduled_for ? new Date(body.scheduled_for) : null
  const isFuture = !!scheduledFor && !isNaN(scheduledFor.getTime()) && scheduledFor.getTime() > Date.now() + 30000
  if (!accountId || !caption) return NextResponse.json({ error: 'Missing post content' }, { status: 400 })
  if (content_type !== 'carousel' && !media_url) return NextResponse.json({ error: 'Missing post content' }, { status: 400 })

  const { data: acct } = await supabase.from('social_accounts')
    .select('id, ig_business_id, access_token').eq('id', accountId).eq('user_id', user.id).maybeSingle()
  if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const svc = await createServiceClient()

  // ─── Carousel publishing ─────────────────────────────────────────────────────
  if (content_type === 'carousel') {
    const carouselSlides = body.carousel_slides
    if (!Array.isArray(carouselSlides) || carouselSlides.length < 2) {
      return NextResponse.json({ error: 'Carousel needs at least 2 slides' }, { status: 400 })
    }

    // Upload all slide images to stable Supabase public URLs
    const stableSlideUrls: string[] = []
    for (const slide of carouselSlides) {
      if (!slide.image_url) continue
      try {
        const url = await ensurePublicUrl(slide.image_url, svc)
        stableSlideUrls.push(url)
      } catch {
        return NextResponse.json({ error: 'Failed to upload carousel image' }, { status: 502 })
      }
    }
    if (stableSlideUrls.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 valid images for carousel' }, { status: 400 })
    }

    // Create post log entry
    const { data: log, error: logErr } = await svc.from('post_logs').insert({
      user_id: user.id, social_account_id: accountId, platform: 'instagram',
      status: isFuture ? 'scheduled' : 'pending',
      image_url: stableSlideUrls[0], caption, topic_used: topic,
      content_type: 'carousel',
      scheduled_for: isFuture ? scheduledFor!.toISOString() : new Date().toISOString(),
    }).select('id').single()
    if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

    if (isFuture) {
      return NextResponse.json({ ok: true, scheduled: true, scheduled_for: scheduledFor!.toISOString(), post_log_id: log.id })
    }

    // Publish carousel via Instagram Graph API (3-step flow)
    try {
      // Step 1: Create individual media containers for each slide
      const containerIds: string[] = []
      for (const url of stableSlideUrls) {
        const params = new URLSearchParams({
          image_url: url,
          is_carousel_item: 'true',
          access_token: acct.access_token,
        })
        const cRes = await fetch(
          `https://graph.facebook.com/v22.0/${acct.ig_business_id}/media?${params}`,
          { method: 'POST' }
        )
        const cData = await cRes.json()
        if (cData.error) throw new Error(cData.error.message || 'Container creation failed')
        containerIds.push(cData.id)
      }

      // Step 2: Create the carousel container referencing all children
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: containerIds.join(','),
        caption,
        access_token: acct.access_token,
      })
      const crRes = await fetch(
        `https://graph.facebook.com/v22.0/${acct.ig_business_id}/media?${carouselParams}`,
        { method: 'POST' }
      )
      const crData = await crRes.json()
      if (crData.error) throw new Error(crData.error.message || 'Carousel creation failed')

      // Step 3: Publish the carousel
      const pubParams = new URLSearchParams({
        creation_id: crData.id,
        access_token: acct.access_token,
      })
      const pubRes = await fetch(
        `https://graph.facebook.com/v22.0/${acct.ig_business_id}/media_publish?${pubParams}`,
        { method: 'POST' }
      )
      const pubData = await pubRes.json()
      if (pubData.error) throw new Error(pubData.error.message || 'Publish failed')

      // Mark as published
      await svc.from('post_logs').update({
        status: 'published', ig_post_id: pubData.id,
      }).eq('id', log.id)

      return NextResponse.json({ ok: true, post_log_id: log.id, ig_post_id: pubData.id })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Carousel publish failed'
      await svc.from('post_logs').update({ status: 'failed', error_message: msg }).eq('id', log.id)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }


  // Resolve media to a stable public Supabase URL
  const isVideo = content_type === 'reel' || media_url.match(/\.(mp4|mov|webm)(\?|$)/i) !== null
  let stableMediaUrl: string
  try { stableMediaUrl = await ensurePublicUrl(media_url, svc, isVideo) }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Media upload failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Scheduled for later → store it; the cron publishes when its time arrives.
  if (isFuture) {
    const { data: slog, error: sErr } = await svc.from('post_logs').insert({
      user_id: user.id, social_account_id: accountId, platform: 'instagram',
      status: 'scheduled', image_url: stableMediaUrl, caption, topic_used: topic,
      content_type,
      scheduled_for: scheduledFor!.toISOString(),
    }).select('id').single()
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, scheduled: true, scheduled_for: scheduledFor!.toISOString(), post_log_id: slog.id })
  }

  // Publish now
  const { data: log, error: logErr } = await svc.from('post_logs').insert({
    user_id: user.id, social_account_id: accountId, platform: 'instagram',
    status: 'pending', image_url: stableMediaUrl, caption, topic_used: topic,
    content_type,
    scheduled_for: new Date().toISOString(),
  }).select('id').single()
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  try {
    await fetch(N8N_PUBLISH_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: stableMediaUrl,
        caption,
        ig_business_id: acct.ig_business_id,
        access_token: acct.access_token,
        post_log_id: log.id,
        content_type,
      }),
    })
  } catch {
    await svc.from('post_logs').update({ status: 'failed', error_message: 'Publish webhook unreachable' }).eq('id', log.id)
    return NextResponse.json({ error: 'Publish failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, post_log_id: log.id })
}
