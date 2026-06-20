import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Team adds a comment to the revision thread without changing content status
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { comment } = await req.json()

  if (!comment?.trim()) {
    return NextResponse.json({ error: 'Comment required' }, { status: 400 })
  }

  const revision = await prisma.revision.create({
    data: { contentId: id, requestedById: session.user.id, comment: comment.trim() },
    include: { requestedBy: { select: { name: true, role: true } } },
  })

  return NextResponse.json(revision)
}
