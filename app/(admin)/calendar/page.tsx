import { prisma } from '@/lib/prisma'
import CalendarView from '@/components/CalendarView'

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string; client?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const year  = parseInt(sp.year  ?? String(now.getFullYear()))
  const month = parseInt(sp.month ?? String(now.getMonth() + 1))

  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0, 23, 59, 59)

  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  const content = await prisma.content.findMany({
    where: {
      ...(sp.client ? { brief: { clientId: sp.client } } : {}),
      OR: [
        { scheduledDate: { gte: start, lte: end } },
        { scheduledDate: null, brief: { scheduledMonth: { gte: start, lte: end } } }
      ]
    },
    include: {
      brief: {
        select: { title: true, scheduledMonth: true, client: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Normalise: use scheduledDate if set, else first day of scheduledMonth
  const items = content.map(c => ({
    id:           c.id,
    day:          c.scheduledDate
                    ? new Date(c.scheduledDate).getDate()
                    : new Date(c.brief.scheduledMonth).getMonth() + 1 === month
                      ? 1
                      : null,
    platform:     c.platform,
    contentType:  c.contentType,
    status:       c.status,
    caption:      c.caption ?? '',
    clientName:   c.brief.client.name,
    briefTitle:   c.brief.title
  })).filter(i => i.day !== null) as {
    id: string; day: number; platform: string; contentType: string
    status: string; caption: string; clientName: string; briefTitle: string
  }[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">View all scheduled content for the month.</p>
      </div>
      <CalendarView
        year={year}
        month={month}
        items={items}
        clients={clients}
        selectedClient={sp.client ?? ''}
      />
    </div>
  )
}
