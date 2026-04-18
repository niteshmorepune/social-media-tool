import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import BriefGenerateButton from '@/components/BriefGenerateButton'
import ClientAvatar from '@/components/ClientAvatar'
import { getStatusColor, getStatusLabel, formatMonth } from '@/lib/utils'

export default async function GeneratePage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const pendingOnly = filter === 'pending'

  const briefs = await prisma.brief.findMany({
    orderBy: { scheduledMonth: 'desc' },
    include: {
      client: { select: { name: true, primaryColor: true } },
      platforms: {
        include: {
          content: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      }
    }
  })

  // When pending-only, drop platforms that already have content and drop briefs
  // that have no remaining platforms after filtering.
  const visibleBriefs = briefs
    .map(brief => ({
      ...brief,
      platforms: pendingOnly
        ? brief.platforms.filter(p => p.content.length === 0)
        : brief.platforms
    }))
    .filter(brief => brief.platforms.length > 0)

  const totalPending = briefs.reduce(
    (sum, b) => sum + b.platforms.filter(p => p.content.length === 0).length,
    0
  )

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Content</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select a brief and generate AI content per platform. Each generates independently.
          </p>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg shrink-0">
          <Link
            href="/generate"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !pendingOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </Link>
          <Link
            href="/generate?filter=pending"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pendingOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Not generated
            {totalPending > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                pendingOnly ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {totalPending}
              </span>
            )}
          </Link>
        </div>
      </div>

      {visibleBriefs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          {pendingOnly ? (
            <>
              <p className="text-gray-500 text-sm">All platforms have been generated.</p>
              <Link href="/generate" className="text-blue-600 text-sm font-medium mt-1 inline-block hover:underline">
                View all
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm">No briefs yet.</p>
              <Link href="/briefs/new" className="text-blue-600 text-sm font-medium mt-1 inline-block hover:underline">
                Create a brief first
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBriefs.map(brief => (
            <div key={brief.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Brief header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClientAvatar name={brief.client.name} />
                  <div>
                    <p className="font-semibold text-gray-900">{brief.title}</p>
                    <p className="text-xs text-gray-500">{brief.client.name} · {formatMonth(brief.scheduledMonth)}</p>
                  </div>
                </div>
                <Link href={`/briefs/${brief.id}`} className="text-xs text-gray-400 hover:text-gray-600">
                  View brief →
                </Link>
              </div>

              {/* Platforms */}
              <div className="divide-y divide-gray-100">
                {brief.platforms.map(p => {
                  const content = p.content[0]
                  return (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{p.platform}</p>
                          <p className="text-xs text-gray-500">{p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}</p>
                        </div>
                        {content && (
                          <div className="hidden sm:flex items-center gap-3 min-w-0">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(content.status)}`}>
                              {getStatusLabel(content.status)}
                            </span>
                            {content.caption && (
                              <p className="text-xs text-gray-400 truncate max-w-xs">{content.caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <BriefGenerateButton briefPlatformId={p.id} hasContent={!!content} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
