export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}

  const accountId = body.account_id as string | undefined
  const caption   = body.caption as string | undefined
  const imageUrl  = body.image_url as string | undefined
  const topic     = body.topic as string | undefined
  const contentType = (body.content_type as string) || 'post'

  if (!accountId || !caption) {
    return NextResponse.json(
      { error: 'account_id and caption are required' },
      { status: 400 },
    )
  }

  const svc = await createServiceClient()

  const { error } = await svc.from('post_logs').insert({
    user_id: user.id,
    social_account_id: accountId,
    platform: 'instagram',
    status: 'draft',
    caption,
    image_url: imageUrl ?? null,
    topic_used: topic ?? null,
    content_type: contentType,
  })

  if (error) {
    return NextResponse.json(
      { error: `Failed to save draft: ${error.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}

  const id = body.id as string | undefined
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const svc = await createServiceClient()
  const { error } = await svc
    .from('post_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  if (error) {
    return NextResponse.json({ error: `Failed to delete draft: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
