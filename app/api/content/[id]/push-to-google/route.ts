import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { pushContentToGoogleAds, GoogleAdsPushError } from '@/lib/google-ads'

// Team-only: push an approved Google Ads Responsive Search Ad copy as a
// brand-new, fully paused Campaign+Budget+AdGroup+Ad in the NEDS house Ads
// account. See lib/google-ads.ts for the full guardrail list — unlike the
// Meta push, this DOES create budget-adjacent objects (Google's API has no
// standalone-creative equivalent), so read that file before touching this.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { adGroupAdResourceName } = await pushContentToGoogleAds(id)

    await prisma.revision.create({
      data: {
        contentId: id,
        requestedById: session.user.id,
        comment: `Pushed to Google Ads as a paused draft: ${adGroupAdResourceName}.`,
      },
    })

    const updated = await prisma.content.findUnique({ where: { id } })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof GoogleAdsPushError) {
      await prisma.content.update({
        where: { id },
        data: { googlePushError: err.message },
      }).catch(() => null) // best-effort — don't let a logging failure mask the real error
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('Push to Google Ads error:', err)
    return NextResponse.json({ error: 'Push to Google Ads failed — try again.' }, { status: 500 })
  }
}
