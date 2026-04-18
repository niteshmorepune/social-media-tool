import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      client: true,
      platforms: true,
      content: { orderBy: { createdAt: 'desc' }, include: { revisions: { orderBy: { createdAt: 'desc' } } } },
      createdBy: { select: { name: true } }
    }
  })

  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(brief)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.brief.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
