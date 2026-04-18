import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { briefs: true } },
      users: { where: { role: 'CLIENT' }, select: { id: true, name: true, email: true } }
    }
  })

  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId } = body

  if (!name || !industry || !brandTone || !targetAudience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const client = await prisma.client.create({
    data: { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId }
  })

  return NextResponse.json(client, { status: 201 })
}
