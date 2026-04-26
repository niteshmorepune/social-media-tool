import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const briefs = await prisma.brief.findMany({
    orderBy: { scheduledMonth: 'desc' },
    include: {
      client: { select: { id: true, name: true, primaryColor: true } },
      createdBy: { select: { name: true } },
      platforms: true,
      _count: { select: { content: true } }
    }
  })

  return NextResponse.json(briefs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { clientId, title, contentGoal, campaignDescription, specialInstructions, scheduledMonth, platforms } = body

  if (!clientId || !title || !contentGoal || !campaignDescription || !scheduledMonth || !platforms?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const brief = await prisma.brief.create({
    data: {
      clientId,
      title,
      contentGoal,
      campaignDescription,
      specialInstructions,
      scheduledMonth: new Date(scheduledMonth),
      createdById: session.user.id,
      platforms: {
        create: platforms.map((p: { platform: string; contentType: string; postsCount?: number }) => ({
          platform:   p.platform,
          contentType: p.contentType,
          postsCount: p.postsCount ?? 1
        }))
      }
    },
    include: { platforms: true, client: true }
  })

  return NextResponse.json(brief, { status: 201 })
}
