export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    // Only allow deleting posts that are scheduled, pending, or pending_approval
    // Never allow deleting already-published posts
    const { data: post, error: fetchErr } = await supabase
      .from('post_logs')
      .select('id, status, user_id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot delete a published post' },
        { status: 400 }
      )
    }

    const { error: deleteErr } = await supabase
      .from('post_logs')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    if (deleteErr) {
      console.error('Delete post error:', deleteErr)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete post error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
