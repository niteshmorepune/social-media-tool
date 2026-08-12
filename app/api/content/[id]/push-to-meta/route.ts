import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { pushContentToMetaCreative, MetaAdsPushError } from '@/lib/meta-ads'

// Team-only: push an approved Meta Ads copy variant to the NEDS house ad
// account's Creative library. Creates ONLY an Ad Creative asset — no
// Campaign/AdSet/Ad, so this never touches budget/targeting/schedule/
// activation. See lib/meta-ads.ts for the full scope rationale (house
// account only, phase 1).
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { creativeId } = await pushContentToMetaCreative(id)

    await prisma.revision.create({
      data: {
        contentId: id,
        requestedById: session.user.id,
        comment: `Pushed to Meta Ads Manager as Creative ${creativeId}.`,
      },
    })

    const updated = await prisma.content.findUnique({ where: { id } })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof MetaAdsPushError) {
      await prisma.content.update({
        where: { id },
        data: { metaPushError: err.message },
      }).catch(() => null) // best-effort — don't let a logging failure mask the real error
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('Push to Meta Ads Manager error:', err)
    return NextResponse.json({ error: 'Push to Meta Ads Manager failed — try again.' }, { status: 500 })
  }
}
