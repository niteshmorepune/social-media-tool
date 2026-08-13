import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { runAdReview } from '@/lib/ad-review'
import { logAiUsage } from '@/lib/ai-usage'

// Team-only: on-demand AI critique of already-generated Meta/Google ad copy.
// Critique-only — never rewrites the copy itself. See lib/ad-review.ts.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const content = await prisma.content.findUnique({
    where: { id },
    include: { briefPlatform: true, brief: { select: { clientId: true, contentGoal: true } } },
  })

  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (content.contentType !== 'AD_COPY') {
    return NextResponse.json({ error: 'AI Ad Review only applies to ad copy' }, { status: 400 })
  }

  const platform = content.briefPlatform.platform as 'Meta Ads' | 'Google Ads'
  const copy = platform === 'Meta Ads'
    ? {
        primaryText: content.adPrimaryText,
        headline: content.adHeadline,
        description: content.adDescription,
        callToAction: content.callToAction,
      }
    : {
        headlines: content.adHeadlines,
        descriptions: content.adDescriptions,
        paths: content.adPaths,
        businessName: content.businessName,
      }

  let result
  try {
    result = await runAdReview(platform, copy, content.brief.contentGoal)
  } catch (err) {
    console.error('AI Ad Review error:', err)
    return NextResponse.json({ error: 'AI Ad Review failed — try again' }, { status: 500 })
  }

  await logAiUsage({
    userId: session.user.id,
    clientId: content.brief.clientId,
    toolId: 'AD_REVIEW',
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  })

  const updated = await prisma.content.update({
    where: { id },
    data: {
      adReviewScore: result.score,
      adReviewFeedback: result.feedback as unknown as object,
      adReviewedAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}
