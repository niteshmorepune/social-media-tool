import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, contentReadyEmail } from '@/lib/email'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const content = await prisma.content.findUnique({
    where: { id },
    include: { revisions: { include: { requestedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } }
  })

  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(content)
}

// Internal team: approve, reject, or mark as ready for client review
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { action, comment } = body

  // Dedicated scheduledDate update — no action required
  if ('scheduledDate' in body) {
    const updated = await prisma.content.update({
      where: { id },
      data: { scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null }
    })
    return NextResponse.json(updated)
  }

  const validActions = ['APPROVE', 'REJECT', 'SEND_TO_CLIENT']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const statusMap: Record<string, string> = {
    APPROVE:        'APPROVED',
    REJECT:         'REJECTED',
    SEND_TO_CLIENT: 'PENDING'
  }

  const content = await prisma.content.update({
    where: { id },
    data: { status: statusMap[action] as 'APPROVED' | 'REJECTED' | 'PENDING' },
    include: {
      brief: {
        include: {
          client: {
            include: {
              users: { where: { role: 'CLIENT' }, select: { email: true, name: true } }
            }
          }
        }
      }
    }
  })

  // If sending to client — email all client users
  if (action === 'SEND_TO_CLIENT' && content.brief.client.users.length > 0) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal`
    for (const clientUser of content.brief.client.users) {
      const { subject, html } = contentReadyEmail(clientUser.name, portalUrl)
      await sendEmail({ to: clientUser.email, subject, html }).catch(() => {/* non-blocking */})
    }
  }

  // Log a revision note if comment provided
  if (comment) {
    await prisma.revision.create({
      data: { contentId: id, requestedById: session.user.id, comment }
    })
  }

  return NextResponse.json(content)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.content.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
