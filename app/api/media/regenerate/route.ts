import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  generateImage,
  generateCarouselImages,
  generateThumbnailAndStartVideo,
  SlideInput,
} from '@/lib/media-generation'
import type { Content } from '@prisma/client'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentId } = await req.json()

  const content = await prisma.content.findUnique({ where: { id: contentId } })
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  // Validate we have the prompts needed before kicking off
  const hasPrompts =
    (content.contentType === 'IMAGE' && !!content.imagePrompt) ||
    (content.contentType === 'VIDEO' && !!content.thumbnailPrompt && !!content.videoConcept && !!content.hook) ||
    (content.contentType === 'CAROUSEL' && !!content.slides)

  if (!hasPrompts) {
    return NextResponse.json({ error: 'No media prompt available — regenerate the full content first' }, { status: 422 })
  }

  // Mark as generating and respond immediately — pipeline runs in background.
  // Clear videoUrl for VIDEO so MediaDisplay shows VideoStatusPoller instead of the stale video.
  await prisma.content.update({
    where: { id: contentId },
    data: {
      mediaStatus: 'GENERATING',
      mediaJobId:  null,
      ...(content.contentType === 'VIDEO' ? { videoUrl: null } : {}),
    },
  })

  // Fire-and-forget: continues after response is sent (Node.js / Docker environment)
  runPipeline(content).catch(async (err) => {
    console.error('Media regeneration error:', err)
    try {
      await prisma.content.update({ where: { id: contentId }, data: { mediaStatus: 'FAILED' } })
    } catch {}
  })

  return NextResponse.json({ mediaStatus: 'GENERATING' })
}

async function runPipeline(content: Content) {
  if (content.contentType === 'IMAGE' && content.imagePrompt) {
    const imageUrl = await generateImage(content.imagePrompt, content.platform, 'IMAGE')
    await prisma.content.update({
      where: { id: content.id },
      data: { imageUrl, mediaStatus: 'READY' },
    })
    return
  }

  if (content.contentType === 'VIDEO' && content.thumbnailPrompt && content.videoConcept && content.hook) {
    const { thumbnailUrl, mediaJobId } = await generateThumbnailAndStartVideo(
      content.thumbnailPrompt,
      content.videoConcept,
      content.hook,
      content.platform
    )
    await prisma.content.update({
      where: { id: content.id },
      data: { thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' },
    })
    return
  }

  if (content.contentType === 'CAROUSEL' && content.slides) {
    const rawSlides = content.slides as unknown as SlideInput[]
    const slidesWithImages = await generateCarouselImages(rawSlides, content.platform)
    await prisma.content.update({
      where: { id: content.id },
      data: { slides: JSON.parse(JSON.stringify(slidesWithImages)), mediaStatus: 'READY' },
    })
  }
}
