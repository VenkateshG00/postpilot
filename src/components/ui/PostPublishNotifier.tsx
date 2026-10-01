'use client'

import { useEffect, useRef } from 'react'
import { useToast } from './Toast'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Polls post_logs for newly published posts and fires a toast.
 * Sits inside the dashboard layout so it runs on every page.
 */
export default function PostPublishNotifier() {
  const { addToast } = useToast()
  const seenRef = useRef<Set<string>>(new Set())
  const lastCheckRef = useRef<string>(new Date().toISOString())

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let mounted = true

    async function poll() {
      if (!mounted) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const since = lastCheckRef.current
        lastCheckRef.current = new Date().toISOString()

        const { data: posts } = await supabase
          .from('post_logs')
          .select('id, caption, status, published_at, image_url')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .gt('published_at', since)
          .order('published_at', { ascending: false })
          .limit(5)

        if (!posts?.length) return

        for (const p of posts) {
          if (seenRef.current.has(p.id)) continue
          seenRef.current.add(p.id)

          const preview = p.caption
            ? p.caption.slice(0, 60) + (p.caption.length > 60 ? '…' : '')
            : 'Your post'

          addToast(`🎉 Post is live! "${preview}"`, 'success', 7000)
        }
      } catch {
        // Silent fail — notification is best-effort
      }
    }

    // Poll every 30 seconds
    poll()
    const interval = setInterval(poll, 30_000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [addToast])

  // Also show toast for failed posts
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let mounted = true
    const failSeenRef = new Set<string>()

    async function pollFailed() {
      if (!mounted) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check for recently failed posts (last 2 minutes)
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        const { data: posts } = await supabase
          .from('post_logs')
          .select('id, caption, error_message')
          .eq('user_id', user.id)
          .eq('status', 'failed')
          .gt('created_at', twoMinAgo)
          .limit(3)

        if (!posts?.length) return

        for (const p of posts) {
          if (failSeenRef.has(p.id)) continue
          failSeenRef.add(p.id)
          addToast(`Post failed: ${p.error_message || 'Unknown error'}`, 'error', 8000)
        }
      } catch {}
    }

    pollFailed()
    const interval = setInterval(pollFailed, 30_000)

    return () => { mounted = false; clearInterval(interval) }
  }, [addToast])

  return null // Render nothing — just side effects
}
