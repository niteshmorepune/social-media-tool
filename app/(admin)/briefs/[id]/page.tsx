import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatMonth, getStatusColor, getStatusLabel } from '@/lib/utils'
import BriefGenerateButton from '@/components/BriefGenerateButton'
import BulkGenerateButton from '@/components/BulkGenerateButton'
import ContentViewDrawer from '@/components/ContentViewDrawer'
import DeleteBriefButton from '@/components/DeleteBriefButton'
import CollapsiblePlatformCard from '@/components/CollapsiblePlatformCard'

export default async function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      platforms: {
        include: {
          content: { orderBy: { createdAt: 'asc' } }
        }
      }
    }
  })

  if (!brief) notFound()

  const totalPostsPlanned = brief.platforms.reduce((s, p) => s + p.postsCount, 0)
  const totalPostsDone    = brief.platforms.reduce((s, p) => s + p.content.length, 0)

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/briefs" className="hover:text-gray-700">Briefs</Link>
          <span>/</span>
          <span className="text-gray-900">{brief.title}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {brief.client.name} · {formatMonth(brief.scheduledMonth)} · Created by {brief.createdBy.name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DeleteBriefButton briefId={brief.id} />
            <BulkGenerateButton
              platforms={brief.platforms.map(p => ({
                id:            p.id,
                postsCount:    p.postsCount,
                existingCount: p.content.length,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Brief details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Content Goal</p>
          <p className="text-sm text-gray-800">{brief.contentGoal}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Content Brief</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{brief.campaignDescription}</p>
        </div>
        {brief.specialInstructions && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Special Instructions</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{brief.specialInstructions}</p>
          </div>
        )}
      </div>

      {/* Platform + content status */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Platforms & Content</h2>
        <span className="text-xs text-gray-500">{totalPostsDone} of {totalPostsPlanned} posts generated</span>
      </div>

      <div className="space-y-3">
        {brief.platforms.map(p => {
          const existingCount = p.content.length
          const postsCount    = p.postsCount
          const isComplete    = existingCount >= postsCount && postsCount > 0

          return (
            <CollapsiblePlatformCard
              key={p.id}
              defaultOpen={!isComplete}
              header={
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{p.platform}</p>
                    <p className="text-sm text-gray-500">
                      {p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isComplete
                        ? 'bg-green-50 text-green-700'
                        : existingCount > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {existingCount}/{postsCount} posts
                    </span>
                    <BriefGenerateButton
                      briefPlatformId={p.id}
                      postsCount={postsCount}
                      contentItems={p.content.map(c => ({
                        id:          c.id,
                        mediaStatus: c.mediaStatus,
                        status:      c.status,
                        caption:     c.caption,
                      }))}
                    />
                  </div>
                </div>
              }
            >
              {p.content.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {p.content.map((c, i) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <span className="text-xs text-gray-400 mt-0.5 w-5 shrink-0">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(c.status)}`}>
                            {getStatusLabel(c.status)}
                          </span>
                          {c.mediaStatus !== 'NONE' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              c.mediaStatus === 'READY'      ? 'bg-green-50 text-green-600' :
                              c.mediaStatus === 'GENERATING' ? 'bg-blue-50 text-blue-600'  :
                              c.mediaStatus === 'FAILED'     ? 'bg-red-50 text-red-600'    : ''
                            }`}>
                              {c.mediaStatus === 'READY'      ? 'Media ready'         :
                               c.mediaStatus === 'GENERATING' ? 'Generating media...' : 'Media failed'}
                            </span>
                          )}
                        </div>
                        {c.caption && (
                          <p className="text-xs text-gray-500 truncate">{c.caption}</p>
                        )}
                      </div>
                      <ContentViewDrawer
                        contentId={c.id}
                        postNumber={i + 1}
                        scheduledMonth={brief.scheduledMonth.toISOString()}
                        userRole={session!.user.role}
                        platform={c.platform}
                        contentType={c.contentType}
                        status={c.status}
                        mediaStatus={c.mediaStatus}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CollapsiblePlatformCard>
          )
        })}
      </div>
    </div>
  )
}
