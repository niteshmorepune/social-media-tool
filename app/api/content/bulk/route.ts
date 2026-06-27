import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkAndFireBriefApproved } from '@/lib/crm-webhook'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ids, action } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }
  if (!['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

  const result = await prisma.content.updateMany({
    where: { id: { in: ids } },
    data: { status: newStatus as 'APPROVED' | 'REJECTED' },
  })

  // After bulk approve, check each affected brief for full completion.
  if (action === 'APPROVE') {
    const affectedBriefs = await prisma.brief.findMany({
      where: { content: { some: { id: { in: ids } } } },
      select: { id: true, clientId: true },
    })
    for (const brief of affectedBriefs) {
      checkAndFireBriefApproved(brief.id, brief.clientId).catch(() => null)
    }
  }

  return NextResponse.json({ updated: result.count })
}
