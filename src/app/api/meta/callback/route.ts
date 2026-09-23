export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const APP_URL = 'https://postpilot-1ia.pages.dev'
  const META_APP_ID = process.env.META_APP_ID!
  const META_APP_SECRET = process.env.META_APP_SECRET!
  const REDIRECT_URI = `${APP_URL}/api/meta/callback`

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=meta_denied`)
  }

  try {
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code
      })
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error_type) throw new Error(tokenData.error_message)

    const shortToken = tokenData.access_token
    const igUserId = tokenData.user_id

    const longRes = await fetch(
      `https://graph.instagram.com/access_token?` +
      new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: META_APP_SECRET,
        access_token: shortToken
      })
    )
    const longData = await longRes.json()
    if (longData.error) throw new Error(longData.error.message)

    const longToken = longData.access_token
    const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5183944) * 1000)


    // 3. Get Instagram user details
    const userRes = await fetch(
      `https://graph.instagram.com/me?` +
      new URLSearchParams({
        fields: 'id,name,username,profile_picture_url',
        access_token: longToken
      })
    )
    // const userRes = await fetch(
    //   `https://graph.instagram.com/v19.0/${igUserId}?` +
    //   new URLSearchParams({
    //     fields: 'id,name,username,profile_picture_url',
    //     access_token: longToken
    //   })
    // )
    const userData = await userRes.json()
    if (userData.error) throw new Error(userData.error.message)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`)

    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform: 'instagram',
      account_id: String(userData.id),
      account_name: userData.username || userData.name,
      account_picture_url: userData.profile_picture_url,
      access_token: longToken,
      token_expires_at: expiresAt.toISOString(),
      ig_business_id: String(userData.id),
      is_active: true
    }, { onConflict: 'user_id,platform,account_id' })

    return NextResponse.redirect(`${APP_URL}/dashboard/connect?success=1`)
  } catch (err: any) {
    const msg = encodeURIComponent(err.message || 'Connection failed')
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=${msg}`)
  }
}




// export const runtime = 'edge'

// import { NextRequest, NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'

// const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
// const META_APP_ID = process.env.META_APP_ID!
// const META_APP_SECRET = process.env.META_APP_SECRET!
// const REDIRECT_URI = `${APP_URL}/api/meta/callback`

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const code = searchParams.get('code')
//   const error = searchParams.get('error')

//   if (error || !code) {
//     return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=meta_denied`)
//   }

//   try {
//     // 1. Exchange code for short-lived token
//     const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       body: new URLSearchParams({
//         client_id: META_APP_ID,
//         client_secret: META_APP_SECRET,
//         grant_type: 'authorization_code',
//         redirect_uri: REDIRECT_URI,
//         code
//       })
//     })
//     const tokenData = await tokenRes.json()
//     if (tokenData.error_type) throw new Error(tokenData.error_message)

//     const shortToken = tokenData.access_token
//     const igUserId = tokenData.user_id

//     // 2. Exchange for long-lived token (60 days)
//     const longRes = await fetch(
//       `https://graph.instagram.com/access_token?` +
//       new URLSearchParams({
//         grant_type: 'ig_exchange_token',
//         client_secret: META_APP_SECRET,
//         access_token: shortToken
//       })
//     )
//     const longData = await longRes.json()
//     if (longData.error) throw new Error(longData.error.message)

//     const longToken = longData.access_token
//     const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5183944) * 1000)

//     // 3. Get Instagram user details
//     const userRes = await fetch(
//       `https://graph.instagram.com/v19.0/${igUserId}?` +
//       new URLSearchParams({
//         fields: 'id,name,username,profile_picture_url',
//         access_token: longToken
//       })
//     )
//     const userData = await userRes.json()
//     if (userData.error) throw new Error(userData.error.message)

//     // 4. Save to Supabase
//     const supabase = await createClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`)

//     await supabase.from('social_accounts').upsert({
//       user_id: user.id,
//       platform: 'instagram',
//       account_id: String(igUserId),
//       account_name: userData.username || userData.name,
//       account_picture_url: userData.profile_picture_url,
//       access_token: longToken,
//       token_expires_at: expiresAt.toISOString(),
//       ig_business_id: String(igUserId),
//       is_active: true
//     }, { onConflict: 'user_id,platform,account_id' })

//     return NextResponse.redirect(`${APP_URL}/dashboard/connect?success=1`)
//   } catch (err: any) {
//     console.error('Instagram OAuth error:', err)
//     const msg = encodeURIComponent(err.message || 'Connection failed')
//     return NextResponse.redirect(`${APP_URL}/dashboard/connect?error=${msg}`)
//   }
// }