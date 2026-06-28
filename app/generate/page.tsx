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
          content: { orderBy: { createdAt: 'asc' } }
        }
      }
    }
  })

  // When pending-only, drop platforms that already have all posts generated
  const visibleBriefs = briefs
    .map(brief => ({
      ...brief,
      platforms: pendingOnly
        ? brief.platforms.filter(p => p.content.length < p.postsCount)
        : brief.platforms
    }))
    .filter(brief => brief.platforms.length > 0)

  const totalPending = briefs.reduce(
    (sum, b) => sum + b.platforms.filter(p => p.content.length < p.postsCount).length,
    0
  )

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Content</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate AI content per platform. Text is created first — then choose when to generate media.
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
            Incomplete
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
              <p className="text-gray-500 text-sm">All platforms are fully generated.</p>
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
                  const existingCount = p.content.length
                  const postsCount   = p.postsCount
                  const latestContent = p.content[existingCount - 1] ?? null
                  const allDone = existingCount >= postsCount

                  return (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{p.platform}</p>
                          <p className="text-xs text-gray-500">{p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 min-w-0">
                          {/* Post count badge */}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            allDone
                              ? 'bg-green-50 text-green-700'
                              : existingCount > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {existingCount}/{postsCount} posts
                          </span>
                          {latestContent && (
                            <>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(latestContent.status)}`}>
                                {getStatusLabel(latestContent.status)}
                              </span>
                              {latestContent.caption && (
                                <p className="text-xs text-gray-400 truncate max-w-xs">{latestContent.caption}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <BriefGenerateButton
                        briefPlatformId={p.id}
                        postsCount={postsCount}
                        contentItems={p.content.map(c => ({
                          id:          c.id,
                          mediaStatus: c.mediaStatus,
                          status:      c.status,
                          caption:     c.caption
                        }))}
                      />
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
