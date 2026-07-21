import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import GeneratingPoller from '@/components/GeneratingPoller'
import ApprovalsContent from '@/components/ApprovalsContent'

const PAGE_SIZE = 20

export default async function ApprovalsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  const { status: filterStatus, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  // Reset IMAGE/CAROUSEL records stuck in GENERATING (pipeline killed on container restart)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)
  await prisma.content.updateMany({
    where: {
      mediaStatus: 'GENERATING',
      contentType: { in: ['IMAGE', 'CAROUSEL'] },
      updatedAt: { lt: staleThreshold },
    },
    data: { mediaStatus: 'FAILED' },
  })

  const where = filterStatus && filterStatus !== 'ALL'
    ? { status: filterStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' }
    : {}

  const [contentList, totalCount] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        brief: {
          include: { client: { select: { name: true, assignedToId: true } } }
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
          include: { requestedBy: { select: { name: true } } }
        }
      }
    }),
    prisma.content.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const counts = await prisma.content.groupBy({
    by:     ['status'],
    _count: { _all: true }
  })

  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count._all]))

  const filters = [
    { label: 'All',      value: 'ALL',               count: Object.values(countMap).reduce((a, b) => a + b, 0) },
    { label: 'Pending',  value: 'PENDING',            count: countMap.PENDING ?? 0 },
    { label: 'Revision', value: 'REVISION_REQUESTED', count: countMap.REVISION_REQUESTED ?? 0 },
    { label: 'Approved', value: 'APPROVED',           count: countMap.APPROVED ?? 0 },
    { label: 'Rejected', value: 'REJECTED',           count: countMap.REJECTED ?? 0 },
  ]

  const activeFilter = filterStatus ?? 'ALL'

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/approvals?${qs}` : '/approvals'
  }

  const hasGeneratingNonVideo = contentList.some(
    c => c.mediaStatus === 'GENERATING' && c.contentType !== 'VIDEO'
  )

  // Serialize Prisma Date objects before passing to client component
  const serializedContent = contentList.map(c => ({
    ...c,
    scheduledDate: c.scheduledDate ? c.scheduledDate.toISOString() : null,
    slides: c.slides as { slideNumber: number; text: string; imagePrompt: string; imageUrl?: string; altText?: string }[] | null,
    brief: {
      ...c.brief,
      scheduledMonth: c.brief.scheduledMonth.toISOString(),
    },
  }))

  return (
    <div>
      <GeneratingPoller active={hasGeneratingNonVideo} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review, approve, or send content to clients.</p>
      </div>

      {/* Filter tabs — reset to page 1 when changing filter */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {filters.map(f => (
          <a
            key={f.value}
            href={f.value === 'ALL' ? '/approvals' : `/approvals?status=${f.value}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeFilter === f.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === f.value ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {f.count}
              </span>
            )}
          </a>
        ))}
      </div>

      {contentList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No content matching this filter.</p>
        </div>
      ) : (
        <>
          {/* Pagination summary */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <a
                    href={pageUrl(page - 1)}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Prev
                  </a>
                )}
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <a
                    href={pageUrl(page + 1)}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}

          <ApprovalsContent
            contentList={serializedContent}
            userRole={session!.user.role}
          />

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <a href={pageUrl(page - 1)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  ← Prev
                </a>
              )}
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <a href={pageUrl(page + 1)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Next →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
