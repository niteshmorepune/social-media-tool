import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Returns content as JSON for CSV/PDF generation
export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const month    = searchParams.get('month') // "2024-03"
  const format   = searchParams.get('format') ?? 'json' // "json" | "csv"

  const where: Record<string, unknown> = {}
  if (clientId) where.brief = { clientId }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.brief = {
      ...(where.brief as object ?? {}),
      scheduledMonth: {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59)
      }
    }
  }

  const content = await prisma.content.findMany({
    where,
    orderBy: [{ brief: { client: { name: 'asc' } } }, { platform: 'asc' }],
    include: {
      brief: {
        include: { client: { select: { name: true, industry: true } } }
      }
    }
  })

  if (format === 'csv') {
    const headers = [
      'Client', 'Brief', 'Platform', 'Content Type', 'Status',
      'Caption', 'Copy', 'Hook', 'Script', 'Hashtags',
      'Call to Action', 'Image Prompt', 'Video Concept', 'Duration',
      'Scheduled Date'
    ]

    function escCsv(val: string | null | undefined) {
      if (!val) return ''
      const v = String(val).replace(/\r?\n/g, ' ').replace(/"/g, '""')
      return `"${v}"`
    }

    const rows = content.map(c => [
      c.brief.client.name,
      c.brief.title,
      c.platform,
      c.contentType,
      c.status,
      escCsv(c.caption),
      escCsv(c.copy),
      escCsv(c.hook),
      escCsv(c.script),
      escCsv(c.hashtags),
      escCsv(c.callToAction),
      escCsv(c.imagePrompt),
      escCsv(c.videoConcept),
      c.duration ?? '',
      c.scheduledDate ? new Date(c.scheduledDate).toISOString().split('T')[0] : ''
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const fileName = `content-export-${month ?? 'all'}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  }

  return NextResponse.json(content)
}
