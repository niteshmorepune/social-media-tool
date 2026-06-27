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
  // Allow server-to-server calls from the NEDS CRM (deal won → provision client).
  // The key must match SMDOST_SERVICE_KEY in the CRM and SMDOST_SERVICE_KEY here.
  const serviceKey = req.headers.get('x-service-key')
  const isServiceCall = serviceKey && serviceKey === process.env.SMDOST_SERVICE_KEY

  if (!isServiceCall) {
    const session = await auth()
    if (!session || session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json()
  const { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId,
          brandKeywords, contentDos, contentDonts, competitorsToAvoid, preferredHashtags,
          drishtiClientId } = body

  if (!name || !industry || !brandTone || !targetAudience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const client = await prisma.client.create({
    data: { name, industry, brandTone, targetAudience, logoUrl, website, primaryColor, assignedToId,
            brandKeywords, contentDos, contentDonts, competitorsToAvoid, preferredHashtags,
            drishtiClientId: drishtiClientId ?? null }
  })

  return NextResponse.json(client, { status: 201 })
}
