export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user.id : null
}

const BUCKET = 'ai-images'
const FREE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024

export async function GET() {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const svc = await createServiceClient()

  const { data: settings } = await svc.from('app_settings').select('storage_auto_delete_hours').eq('id', 1).single()
  const autoDeleteHours = settings?.storage_auto_delete_hours ?? 24

  const folders = ['media/images', 'media/videos']
  const allFiles: { name: string; path: string; userId: string; size: number; created: string; type: string }[] = []

  for (const folder of folders) {
    const { data: userFolders } = await svc.storage.from(BUCKET).list(folder)
    if (!userFolders) continue

    for (const userFolder of userFolders) {
      if (!userFolder.name) continue
      const userId = userFolder.name
      const prefix = `${folder}/${userId}`
      const { data: files } = await svc.storage.from(BUCKET).list(prefix)
      if (!files) continue

      for (const file of files) {
        if (!file.name || !file.metadata) continue
        allFiles.push({
          name: file.name,
          path: `${prefix}/${file.name}`,
          userId,
          size: file.metadata?.size ?? 0,
          created: file.created_at ?? '',
          type: folder.includes('video') ? 'video' : 'image',
        })
      }
    }
  }

  const { data: rootFiles } = await svc.storage.from(BUCKET).list('', { limit: 500 })
  if (rootFiles) {
    for (const file of rootFiles) {
      if (!file.name || file.id === null || !file.metadata) continue
      if (file.name === 'media' || file.name === '.emptyFolderPlaceholder') continue
      allFiles.push({
        name: file.name,
        path: file.name,
        userId: 'system',
        size: file.metadata?.size ?? 0,
        created: file.created_at ?? '',
        type: 'image',
      })
    }
  }

  const userMap: Record<string, { count: number; totalSize: number }> = {}
  let totalSize = 0
  for (const f of allFiles) {
    totalSize += f.size
    if (!userMap[f.userId]) userMap[f.userId] = { count: 0, totalSize: 0 }
    userMap[f.userId].count++
    userMap[f.userId].totalSize += f.size
  }

  const userIds = Object.keys(userMap).filter(id => id !== 'system')
  const userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await svc.from('profiles').select('id, full_name, email').in('id', userIds)
    if (profiles) {
      for (const p of profiles) {
        userNames[p.id] = p.full_name || p.email || p.id.slice(0, 8)
      }
    }
  }

  const perUser = Object.entries(userMap).map(([userId, stats]) => ({
    userId,
    name: userId === 'system' ? 'AI Generated' : (userNames[userId] || userId.slice(0, 8)),
    fileCount: stats.count,
    totalSize: stats.totalSize,
  })).sort((a, b) => b.totalSize - a.totalSize)

  return NextResponse.json({
    totalSize,
    totalFiles: allFiles.length,
    limitBytes: FREE_LIMIT_BYTES,
    usagePercent: Math.round((totalSize / FREE_LIMIT_BYTES) * 100),
    autoDeleteHours,
    perUser,
    files: allFiles.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
  })
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const svc = await createServiceClient()
  const action = String(body.action ?? '')

  if (action === 'delete_files') {
    const paths = body.paths
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
    }
    const { error } = await svc.storage.from(BUCKET).remove(paths)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: paths.length })
  }

  if (action === 'delete_user_files') {
    const userId = String(body.user_id ?? '')
    if (!userId) return NextResponse.json({ error: 'No user_id' }, { status: 400 })

    const allPaths: string[] = []

    if (userId === 'system') {
      // Root-level files (AI Generated) — not inside media/images or media/videos
      const { data: rootFiles } = await svc.storage.from(BUCKET).list('', { limit: 500 })
      if (rootFiles) {
        for (const f of rootFiles) {
          if (!f.name || f.id === null || !f.metadata) continue
          if (f.name === 'media' || f.name === '.emptyFolderPlaceholder') continue
          allPaths.push(f.name)
        }
      }
    } else {
      for (const folder of ['media/images', 'media/videos']) {
        const prefix = `${folder}/${userId}`
        const { data: files } = await svc.storage.from(BUCKET).list(prefix)
        if (files) {
          for (const f of files) {
            if (f.name) allPaths.push(`${prefix}/${f.name}`)
          }
        }
      }
    }

    if (allPaths.length === 0) return NextResponse.json({ ok: true, deleted: 0 })
    const { error } = await svc.storage.from(BUCKET).remove(allPaths)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: allPaths.length })
  }

  if (action === 'run_cleanup') {
    const { data: settings } = await svc.from('app_settings').select('storage_auto_delete_hours').eq('id', 1).single()
    const hours = settings?.storage_auto_delete_hours ?? 24
    if (hours === 0) return NextResponse.json({ ok: true, cleaned: 0, message: 'Auto-delete is disabled' })

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

    const { data: oldPosts } = await svc.from('post_logs')
      .select('id, image_url')
      .eq('status', 'published')
      .lt('created_at', cutoff.toISOString())
      .not('image_url', 'is', null)
      .limit(200)

    if (!oldPosts || oldPosts.length === 0) {
      return NextResponse.json({ ok: true, cleaned: 0, message: 'No files to clean up' })
    }

    const pathsToDelete: string[] = []
    const logIdsToUpdate: string[] = []

    for (const post of oldPosts) {
      const url = post.image_url || ''
      const match = url.match(/\/storage\/v1\/object\/public\/ai-images\/(.+)$/)
      if (match) {
        pathsToDelete.push(match[1])
        logIdsToUpdate.push(post.id)
      }
    }

    if (pathsToDelete.length > 0) {
      const { error } = await svc.storage.from(BUCKET).remove(pathsToDelete)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      for (const id of logIdsToUpdate) {
        await svc.from('post_logs').update({ image_url: null }).eq('id', id)
      }
    }

    return NextResponse.json({ ok: true, cleaned: pathsToDelete.length })
  }

  if (action === 'update_auto_delete') {
    const hours = Number(body.hours)
    if (![24, 48, 168, 0].includes(hours)) {
      return NextResponse.json({ error: 'Invalid value. Use 24, 48, 168, or 0 (disabled)' }, { status: 400 })
    }
    const { error } = await svc.from('app_settings').update({
      storage_auto_delete_hours: hours,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, hours })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
