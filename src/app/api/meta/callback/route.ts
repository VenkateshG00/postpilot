export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
const META_APP_ID = process.env.META_APP_ID!
const META_APP_SECRET = process.env.META_APP_SECRET!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=meta_denied`)
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: `${APP_URL}/api/meta/callback`,
        code
      })
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    // 2. Exchange short-lived for long-lived token (60 day)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: tokenData.access_token
      })
    )
    const longData = await longRes.json()
    const longToken = longData.access_token
    const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5183944) * 1000)

    // 3. Get Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]
    if (!page) throw new Error('No Facebook Pages found. Create a Page and link it to your Instagram.')

    // 4. Get Instagram Business Account linked to this Page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?` +
      new URLSearchParams({
        fields: 'instagram_business_account',
        access_token: page.access_token
      })
    )
    const igData = await igRes.json()
    const igId = igData.instagram_business_account?.id
    if (!igId) throw new Error('No Instagram Business account linked to this Facebook Page.')

    // 5. Get IG account details
    const igDetailsRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}?` +
      new URLSearchParams({
        fields: 'id,name,username,profile_picture_url',
        access_token: page.access_token
      })
    )
    const igDetails = await igDetailsRes.json()

    // 6. Save to Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`)

    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform: 'instagram',
      account_id: igId,
      account_name: igDetails.username || igDetails.name,
      account_picture_url: igDetails.profile_picture_url,
      access_token: page.access_token, // Page token for publishing
      token_expires_at: expiresAt.toISOString(),
      page_id: page.id,
      ig_business_id: igId,
      is_active: true
    }, { onConflict: 'user_id,platform,account_id' })

    return NextResponse.redirect(`${APP_URL}/dashboard/connect?success=1`)
  } catch (err: any) {
    console.error('Meta OAuth error:', err)
    const msg = encodeURIComponent(err.message || 'Connection failed')
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=${msg}`)
  }
}
