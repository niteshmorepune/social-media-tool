import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, approvedEmail, revisionRequestedEmail } from '@/lib/email'

// Client portal: approve or request revision
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { action, comment } = await req.json()

  if (!['APPROVE', 'REQUEST_REVISION', 'COMMENT'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Verify this content belongs to the client's account
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      brief: {
        include: {
          client: {
            include: {
              users: { where: { id: session.user.id } }
            }
          }
        }
      }
    }
  })

  if (!content || content.brief.client.users.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // COMMENT — add to thread without changing status
  if (action === 'COMMENT') {
    if (!comment?.trim()) return NextResponse.json({ error: 'Comment required' }, { status: 400 })
    const revision = await prisma.revision.create({
      data: { contentId: id, requestedById: session.user.id, comment: comment.trim() },
    })
    return NextResponse.json(revision)
  }

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED'

  const updated = await prisma.content.update({
    where: { id },
    data: { status: newStatus as 'APPROVED' | 'REVISION_REQUESTED' }
  })

  // Log revision comment if provided
  if (comment) {
    await prisma.revision.create({
      data: { contentId: id, requestedById: session.user.id, comment }
    })
  }

  // Notify assigned team member (email + in-app)
  const client = content.brief.client
  const assignedId = client.assignedToId

  // In-app notifications — notify assigned team member or all ADMIN users
  const notifyUserIds: string[] = assignedId
    ? [assignedId]
    : (await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })).map(u => u.id)

  if (notifyUserIds.length > 0) {
    const notifTitle = action === 'APPROVE'
      ? `${client.name} approved a post`
      : `${client.name} requested a revision`
    const notifMessage = `${content.platform} · ${content.brief.title}${comment ? ` — "${comment}"` : ''}`
    await prisma.notification.createMany({
      data: notifyUserIds.map(userId => ({
        userId,
        type:    action === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED',
        title:   notifTitle,
        message: notifMessage,
        link:    '/approvals',
      })),
    }).catch(() => {})
  }

  // Email
  if (assignedId) {
    const teamMember = await prisma.user.findUnique({
      where: { id: assignedId },
      select: { name: true, email: true }
    })
    if (teamMember) {
      const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approvals`
      if (action === 'APPROVE') {
        const { subject, html } = approvedEmail(teamMember.name, client.name, content.platform, adminUrl)
        await sendEmail({ to: teamMember.email, subject, html }).catch(() => {})
      } else if (comment) {
        const { subject, html } = revisionRequestedEmail(teamMember.name, client.name, content.platform, comment, adminUrl)
        await sendEmail({ to: teamMember.email, subject, html }).catch(() => {})
      }
    }
  }

  return NextResponse.json(updated)
}
