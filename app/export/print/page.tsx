import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import PrintReport from '@/components/PrintReport'

export default async function PrintReportPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; month?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') redirect('/login')

  const sp = await searchParams

  const where: Record<string, unknown> = { status: 'APPROVED' }
  if (sp.clientId) where.brief = { clientId: sp.clientId }
  if (sp.month) {
    const [y, m] = sp.month.split('-').map(Number)
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
        include: { client: { select: { name: true, industry: true, website: true } } }
      }
    }
  })

  const clientName = sp.clientId
    ? content[0]?.brief.client.name ?? 'Client'
    : 'All Clients'

  const monthLabel = sp.month
    ? new Date(sp.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'All Months'

  return (
    <PrintReport
      content={content.map(c => ({
        id:             c.id,
        platform:       c.platform,
        contentType:    c.contentType,
        status:         c.status,
        caption:        c.caption,
        copy:           c.copy,
        hook:           c.hook,
        script:         c.script,
        onScreenText:   c.onScreenText,
        hashtags:       c.hashtags,
        callToAction:   c.callToAction,
        imagePrompt:    c.imagePrompt,
        videoConcept:   c.videoConcept,
        thumbnailPrompt:c.thumbnailPrompt,
        duration:       c.duration,
        slides:         c.slides as { slideNumber: number; text: string; imagePrompt: string }[] | null,
        briefTitle:     c.brief.title,
        clientName:     c.brief.client.name
      }))}
      clientName={clientName}
      monthLabel={monthLabel}
      appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'Social Media Dost'}
    />
  )
}
