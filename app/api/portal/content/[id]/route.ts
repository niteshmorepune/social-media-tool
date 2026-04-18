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

  if (!['APPROVE', 'REQUEST_REVISION'].includes(action)) {
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

  // Notify assigned team member
  const client = content.brief.client
  const assignedId = client.assignedToId
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
