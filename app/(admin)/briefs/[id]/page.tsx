import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatMonth, getStatusColor, getStatusLabel } from '@/lib/utils'
import BriefGenerateButton from '@/components/BriefGenerateButton'
import BulkGenerateButton from '@/components/BulkGenerateButton'

export default async function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      platforms: {
        include: {
          content: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      }
    }
  })

  if (!brief) notFound()

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
          <BulkGenerateButton platforms={brief.platforms.map(p => ({ id: p.id }))} />
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
      <h2 className="font-semibold text-gray-900 mb-3">Platforms & Content</h2>
      <div className="space-y-3">
        {brief.platforms.map(p => {
          const latestContent = p.content[0]
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.platform}</p>
                  <p className="text-sm text-gray-500">{p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {latestContent ? (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(latestContent.status)}`}>
                      {getStatusLabel(latestContent.status)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not generated</span>
                  )}
                  <BriefGenerateButton briefPlatformId={p.id} hasContent={!!latestContent} contentId={latestContent?.id ?? null} mediaStatus={latestContent?.mediaStatus ?? null} />
                </div>
              </div>

              {latestContent && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {latestContent.caption && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Caption</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{latestContent.caption}</p>
                    </div>
                  )}
                  {latestContent.hook && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Hook</p>
                      <p className="text-sm text-gray-700">{latestContent.hook}</p>
                    </div>
                  )}
                  <div className="pt-1">
                    <Link href={`/approvals?content=${latestContent.id}`} className="text-xs text-blue-600 hover:underline">
                      View full content & approve →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
