/**
 * Pushes approved SMDost content to nedsdrishti.in as scheduled PostDrafts.
 *
 * Called when every piece of content in a brief is approved (same trigger as
 * the CRM invoice webhook). Only content where mediaStatus is READY or NONE
 * is pushed — videos that are still generating are skipped to avoid empty posts.
 *
 * All fetches are fire-and-forget per item: one failure never blocks others.
 * Callers should .catch(() => null) on the outer function.
 */

import { prisma } from './prisma'

const DRISHTI_URL = process.env.DRISHTI_API_URL?.replace(/\/$/, '')
const DRISHTI_KEY = process.env.DRISHTI_SERVICE_KEY

const PLATFORM_MAP: Record<string, string> = {
  'Instagram':       'INSTAGRAM',
  'Facebook':        'FACEBOOK',
  'LinkedIn':        'LINKEDIN',
  'Twitter':         'TWITTER',
  'TikTok':          'TIKTOK',
  'Google Business': 'GBP',
}

export async function pushBriefToDrishti(briefId: string): Promise<void> {
  if (!DRISHTI_URL || !DRISHTI_KEY) return

  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    select: {
      title: true,
      scheduledMonth: true,
      client: { select: { drishtiClientId: true } },
    },
  })

  const drishtiClientId = brief?.client?.drishtiClientId
  if (!drishtiClientId) return

  const items = await prisma.content.findMany({
    where: {
      briefId,
      status: 'APPROVED',
      mediaStatus: { in: ['READY', 'NONE'] },
    },
  })

  if (items.length === 0) return

  // Default scheduled date: 10th of the brief month at 9 AM — gives the Drishti
  // team time to review and approve before the scheduler auto-publishes.
  const defaultScheduledAt = new Date(
    brief.scheduledMonth.getFullYear(),
    brief.scheduledMonth.getMonth(),
    10, 9, 0, 0,
  )

  for (const item of items) {
    const platform = PLATFORM_MAP[item.platform]
    if (!platform) continue

    const caption = (item.caption ?? item.copy ?? '').trim()
    if (!caption) continue // Drishti requires non-empty caption

    const mediaUrls: string[] = []
    if (item.contentType === 'VIDEO' && item.videoUrl) {
      mediaUrls.push(item.videoUrl)
    } else if (item.contentType === 'CAROUSEL') {
      // Slides JSON may contain per-slide imageUrls generated after the schema comment was written
      const slides = (item.slides ?? []) as Array<{ imageUrl?: string }>
      slides.forEach(s => { if (s.imageUrl) mediaUrls.push(s.imageUrl) })
      if (mediaUrls.length === 0 && item.imageUrl) mediaUrls.push(item.imageUrl)
    } else if (item.imageUrl) {
      mediaUrls.push(item.imageUrl)
    }

    const scheduledAt = item.scheduledDate ?? defaultScheduledAt

    try {
      await fetch(`${DRISHTI_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': DRISHTI_KEY,
        },
        body: JSON.stringify({
          clientId:    drishtiClientId,
          platforms:   [platform],
          caption:     caption.slice(0, 5000),
          mediaUrls,
          scheduledAt: scheduledAt.toISOString(),
          notes:       `Synced from SMDost brief: ${brief.title}`,
          aiGenerated: true,
        }),
      })
    } catch {
      // Non-fatal — one item's failure must not block the remaining items
    }
  }
}
