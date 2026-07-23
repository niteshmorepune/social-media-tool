import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// AI usage/cost totals for a date range — used by the NEDS CRM's AI Usage
// Report (server-to-server, X-Service-Key) to fold SMDost's own Claude spend
// into its combined cross-app view, same pattern as Drishti's GET /api/ai/usage.
// Session-auth also works for a future in-app usage view, but nothing in the
// UI calls this yet.
export async function GET(req: Request) {
  const serviceKey = req.headers.get('x-service-key')
  const isServiceCall = Boolean(serviceKey) && serviceKey === process.env.SMDOST_SERVICE_KEY

  if (!isServiceCall) {
    const session = await auth()
    if (!session || session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId') ?? undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: { clientId?: string; createdAt?: { gte?: Date; lte?: Date } } = {}
  if (clientId) where.clientId = clientId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const totals = await prisma.aIUsageLog.aggregate({
    where,
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    _count: true,
  })

  return NextResponse.json({ data: { totals } })
}
