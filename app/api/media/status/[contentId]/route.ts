import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import getRunway from '@/lib/runway-client'
import { uploadFromUrl } from '@/lib/cloudinary-client'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contentId } = await params

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id:          true,
      mediaStatus: true,
      mediaJobId:  true,
      videoUrl:    true,
      thumbnailUrl:true,
      updatedAt:   true,
      brief:       { select: { clientId: true } }
    }
  })

  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // CLIENT role can only poll their own content
  if (session.user.role === 'CLIENT' && session.user.clientId !== content.brief.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Already resolved — just return current state
  if (content.mediaStatus !== 'GENERATING') {
    return NextResponse.json({
      mediaStatus:  content.mediaStatus,
      videoUrl:     content.videoUrl,
      thumbnailUrl: content.thumbnailUrl,
    })
  }

  // GENERATING but no job ID yet — pipeline may still be starting (< 5 min) or died on restart
  if (!content.mediaJobId) {
    const STALE_MS = 5 * 60 * 1000
    if (Date.now() - content.updatedAt.getTime() > STALE_MS) {
      await prisma.content.update({ where: { id: contentId }, data: { mediaStatus: 'FAILED' } })
      return NextResponse.json({ mediaStatus: 'FAILED', videoUrl: null, thumbnailUrl: content.thumbnailUrl })
    }
    return NextResponse.json({ mediaStatus: 'GENERATING', progress: null, videoUrl: null, thumbnailUrl: content.thumbnailUrl })
  }

  // Check RunwayML task status
  try {
    const task = await getRunway().tasks.retrieve(content.mediaJobId)

    if (task.status === 'SUCCEEDED' && task.output && task.output.length > 0) {
      // Upload to Cloudinary for permanent storage
      const videoUrl = await uploadFromUrl(task.output[0], 'videos', 'video')

      await prisma.content.update({
        where: { id: contentId },
        data:  { videoUrl, mediaStatus: 'READY' }
      })

      return NextResponse.json({ mediaStatus: 'READY', videoUrl, thumbnailUrl: content.thumbnailUrl })
    }

    if (task.status === 'FAILED' || task.status === 'CANCELLED') {
      await prisma.content.update({
        where: { id: contentId },
        data:  { mediaStatus: 'FAILED' }
      })
      return NextResponse.json({ mediaStatus: 'FAILED', videoUrl: null, thumbnailUrl: content.thumbnailUrl })
    }

    // Still running (PENDING | THROTTLED | RUNNING)
    const progress = task.status === 'RUNNING' ? task.progress : null
    return NextResponse.json({
      mediaStatus:  'GENERATING',
      progress,
      videoUrl:     null,
      thumbnailUrl: content.thumbnailUrl,
    })

  } catch (err) {
    console.error('RunwayML poll error:', err)
    return NextResponse.json({ mediaStatus: 'GENERATING', videoUrl: null, thumbnailUrl: content.thumbnailUrl })
  }
}
