export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const IG_API = 'https://graph.instagram.com'

interface IGMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  permalink?: string
  like_count?: number
  comments_count?: number
}

interface IGProfile {
  id: string
  username?: string
  media_count?: number
  followers_count?: number
  follows_count?: number
}

// Fetch user profile info (follower count needed for engagement rate)
async function fetchProfile(accountId: string, token: string): Promise<IGProfile | null> {
  try {
    const r = await fetch(
      `${IG_API}/me?fields=id,username,media_count,followers_count,follows_count&access_token=${token}`
    )
    if (!r.ok) return null
    return await r.json() as IGProfile
  } catch {
    return null
  }
}

// Fetch media list with pagination
async function fetchMedia(accountId: string, token: string, limit = 50): Promise<IGMedia[]> {
  const allMedia: IGMedia[] = []
  let url = `${IG_API}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=${Math.min(limit, 50)}&access_token=${token}`

  // Paginate up to the limit
  while (url && allMedia.length < limit) {
    try {
      const r = await fetch(url)
      if (!r.ok) break
      const d = await r.json() as { data?: IGMedia[]; paging?: { next?: string } }
      if (!d.data || d.data.length === 0) break
      allMedia.push(...d.data)
      url = d.paging?.next ?? ''
    } catch {
      break
    }
  }

  return allMedia.slice(0, limit)
}

// GET /api/analytics/instagram — fetches all media from connected Instagram account
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the active social account
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')

  let accountQ = supabase
    .from('social_accounts')
    .select('id, account_id, account_name, account_picture_url, access_token, platform')
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .eq('is_active', true)

  if (accountId) {
    accountQ = accountQ.eq('id', accountId)
  }

  const { data: accounts } = await accountQ.limit(1)
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'No Instagram account connected', media: [], profile: null })
  }

  const account = accounts[0]
  const token = account.access_token

  // Fetch profile and media in parallel
  const [profile, media] = await Promise.all([
    fetchProfile(account.account_id, token),
    fetchMedia(account.account_id, token, 100),
  ])

  // Calculate engagement metrics
  const totalLikes = media.reduce((s, m) => s + (m.like_count ?? 0), 0)
  const totalComments = media.reduce((s, m) => s + (m.comments_count ?? 0), 0)
  const totalEngagement = totalLikes + totalComments
  const followers = profile?.followers_count ?? 0
  const engagementRate = followers > 0 && media.length > 0
    ? ((totalEngagement / media.length) / followers * 100)
    : 0

  // Map media to a clean format
  const posts = media.map(m => ({
    id: m.id,
    caption: m.caption ?? '',
    media_type: m.media_type,
    media_url: m.media_url ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
    timestamp: m.timestamp,
    permalink: m.permalink ?? null,
    like_count: m.like_count ?? 0,
    comments_count: m.comments_count ?? 0,
  }))

  return NextResponse.json({
    profile: profile ? {
      username: profile.username ?? account.account_name,
      media_count: profile.media_count ?? 0,
      followers_count: profile.followers_count ?? 0,
      follows_count: profile.follows_count ?? 0,
      profile_picture: account.account_picture_url ?? null,
    } : null,
    posts,
    summary: {
      total_posts: posts.length,
      total_likes: totalLikes,
      total_comments: totalComments,
      engagement_rate: Math.round(engagementRate * 100) / 100,
      followers,
    },
  })
}
