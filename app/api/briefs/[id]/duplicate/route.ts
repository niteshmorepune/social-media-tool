import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const original = await prisma.brief.findUnique({
    where: { id },
    include: { platforms: true },
  })

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Advance scheduled month by one calendar month
  const nextMonth = new Date(original.scheduledMonth)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const duplicate = await prisma.brief.create({
    data: {
      clientId:           original.clientId,
      title:              original.title,
      contentGoal:        original.contentGoal,
      campaignDescription: original.campaignDescription,
      specialInstructions: original.specialInstructions,
      scheduledMonth:     nextMonth,
      createdById:        session.user.id,
      platforms: {
        create: original.platforms.map(p => ({
          platform:       p.platform,
          contentType:    p.contentType,
          postsCount:     p.postsCount,
          finalUrl:       p.finalUrl,
          targetKeyword:  p.targetKeyword,
          targetKeywords: p.targetKeywords ?? undefined,
        })),
      },
    },
  })

  return NextResponse.json({ id: duplicate.id })
}
