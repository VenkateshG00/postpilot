export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/upload/media
 * Accepts FormData with a "file" field (image or video).
 * Uploads to Supabase Storage "ai-images" bucket under media/ prefix.
 * Returns { url: string } — the public URL.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const mime = file.type
  const isImage = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/')
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Only image and video files are supported' }, { status: 400 })
  }

  // 50MB limit for videos, 10MB for images
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({
      error: `File too large. Max ${isVideo ? '50MB' : '10MB'} for ${isVideo ? 'videos' : 'images'}.`,
    }, { status: 400 })
  }

  // Determine extension
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  }
  const ext = extMap[mime] || (isImage ? 'jpg' : 'mp4')
  const folder = isVideo ? 'media/videos' : 'media/images'
  const filename = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = await file.arrayBuffer()

  const svc = await createServiceClient()
  const { error: uploadError } = await svc.storage.from('ai-images').upload(filename, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = svc.storage.from('ai-images').getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl, type: isVideo ? 'video' : 'image' })
}
