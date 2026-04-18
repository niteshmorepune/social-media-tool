import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  generateImage,
  generateCarouselImages,
  generateThumbnailAndStartVideo,
  SlideInput,
} from '@/lib/media-generation'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentId } = await req.json()

  const content = await prisma.content.findUnique({ where: { id: contentId } })
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  // Mark as generating so the UI updates immediately
  await prisma.content.update({
    where: { id: contentId },
    data: { mediaStatus: 'GENERATING', mediaJobId: null }
  })

  try {
    if (content.contentType === 'IMAGE' && content.imagePrompt) {
      const imageUrl = await generateImage(content.imagePrompt, content.platform, 'IMAGE')
      await prisma.content.update({
        where: { id: contentId },
        data: { imageUrl, mediaStatus: 'READY' }
      })
      return NextResponse.json({ mediaStatus: 'READY', imageUrl })
    }

    if (content.contentType === 'VIDEO' && content.thumbnailPrompt && content.videoConcept && content.hook) {
      const { thumbnailUrl, mediaJobId } = await generateThumbnailAndStartVideo(
        content.thumbnailPrompt,
        content.videoConcept,
        content.hook,
        content.platform
      )
      await prisma.content.update({
        where: { id: contentId },
        data: { thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' }
      })
      return NextResponse.json({ mediaStatus: 'GENERATING', thumbnailUrl, mediaJobId })
    }

    if (content.contentType === 'CAROUSEL' && content.slides) {
      const rawSlides = content.slides as SlideInput[]
      const slidesWithImages = await generateCarouselImages(rawSlides, content.platform)
      await prisma.content.update({
        where: { id: contentId },
        data: { slides: JSON.parse(JSON.stringify(slidesWithImages)), mediaStatus: 'READY' }
      })
      return NextResponse.json({ mediaStatus: 'READY', slides: slidesWithImages })
    }

    // No prompt available to regenerate from
    await prisma.content.update({ where: { id: contentId }, data: { mediaStatus: 'FAILED' } })
    return NextResponse.json({ error: 'No media prompt available' }, { status: 422 })

  } catch (err) {
    console.error('Media regeneration error:', err)
    await prisma.content.update({ where: { id: contentId }, data: { mediaStatus: 'FAILED' } })
    return NextResponse.json({ error: 'Media generation failed' }, { status: 500 })
  }
}
