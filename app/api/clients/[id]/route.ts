import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      briefs: { orderBy: { scheduledMonth: 'desc' }, take: 10 },
      users: { where: { role: 'CLIENT' }, select: { id: true, name: true, email: true } }
    }
  })

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId } = body

  const client = await prisma.client.update({
    where: { id },
    data: { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId }
  })

  return NextResponse.json(client)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
