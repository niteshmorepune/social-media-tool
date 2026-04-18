import { prisma } from '@/lib/prisma'
import ExportControls from '@/components/ExportControls'

export default async function ExportPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  // Get distinct months that have content
  const briefs = await prisma.brief.findMany({
    select: { scheduledMonth: true },
    distinct: ['scheduledMonth'],
    orderBy: { scheduledMonth: 'desc' }
  })

  const months = briefs.map(b => {
    const d = new Date(b.scheduledMonth)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download content as CSV or print a client report.</p>
      </div>
      <ExportControls clients={clients} months={months} />
    </div>
  )
}
