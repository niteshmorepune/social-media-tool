import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import ApprovalActions from '@/components/ApprovalActions'
import MediaDisplay from '@/components/MediaDisplay'
import RegenerateMediaButton from '@/components/RegenerateMediaButton'
import ScheduleDatePicker from '@/components/ScheduleDatePicker'
import GeneratingPoller from '@/components/GeneratingPoller'

export default async function ApprovalsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; content?: string }>
}) {
  const session = await auth()
  const { status: filterStatus } = await searchParams

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

  const contentList = await prisma.content.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      brief: {
        include: { client: { select: { name: true, assignedToId: true } } }
      },
      revisions: {
        orderBy: { createdAt: 'desc' },
        include: { requestedBy: { select: { name: true } } }
      }
    }
  })

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

  const hasGeneratingNonVideo = contentList.some(
    c => c.mediaStatus === 'GENERATING' && c.contentType !== 'VIDEO'
  )

  return (
    <div>
      <GeneratingPoller active={hasGeneratingNonVideo} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review, approve, or send content to clients.</p>
      </div>

      {/* Filter tabs */}
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
        <div className="space-y-4">
          {contentList.map(c => {
            const slides = c.slides as { slideNumber: number; text: string; imagePrompt: string; imageUrl?: string }[] | null

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{c.brief.client.name}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-sm text-gray-500">{c.platform}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-sm text-gray-500">{c.contentType.charAt(0) + c.contentType.slice(1).toLowerCase()}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{c.brief.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.mediaStatus === 'READY' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                        Media ready
                      </span>
                    )}
                    {c.mediaStatus === 'GENERATING' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
                        Generating media...
                      </span>
                    )}
                    {c.mediaStatus === 'FAILED' && (
                      <RegenerateMediaButton contentId={c.id} />
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                </div>

                {/* Generated media */}
                <div className="px-6 pt-4">
                  <MediaDisplay
                    contentId={c.id}
                    contentType={c.contentType}
                    imageUrl={c.imageUrl}
                    videoUrl={c.videoUrl}
                    thumbnailUrl={c.thumbnailUrl}
                    mediaStatus={c.mediaStatus}
                    slides={slides}
                  />
                </div>

                {/* Text content fields */}
                <div className="px-6 pb-4 space-y-3">
                  {c.caption && <Field label="Caption" value={c.caption} />}
                  {c.hook && <Field label="Hook (first 3 sec)" value={c.hook} />}
                  {c.copy && <Field label="Copy" value={c.copy} />}
                  {c.script && <Field label="Script" value={c.script} />}
                  {c.onScreenText && <Field label="On-screen Text" value={c.onScreenText} />}
                  {c.hashtags && <Field label="Hashtags" value={c.hashtags} accent />}
                  {c.callToAction && <Field label="Call to Action" value={c.callToAction} />}
                  {c.imagePrompt && <Field label="Image Prompt" value={c.imagePrompt} muted />}
                  {c.videoConcept && <Field label="Video Concept" value={c.videoConcept} muted />}
                  {c.thumbnailPrompt && <Field label="Thumbnail Prompt" value={c.thumbnailPrompt} muted />}
                  {c.duration && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-sm text-gray-600">{c.duration}</p>
                    </div>
                  )}
                  {/* Slide text (even if images failed, show the text content) */}
                  {slides && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slide Copy</p>
                      <div className="space-y-2">
                        {slides.map(slide => (
                          <div key={slide.slideNumber} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Slide {slide.slideNumber}</p>
                            <p className="text-sm text-gray-800">{slide.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Revision history */}
                {c.revisions.length > 0 && (
                  <div className="px-6 pb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revision Notes</p>
                    <div className="space-y-2">
                      {c.revisions.map(r => (
                        <div key={r.id} className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-yellow-800">{r.requestedBy.name}</p>
                          <p className="text-sm text-yellow-900 mt-0.5">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <ScheduleDatePicker
                    contentId={c.id}
                    scheduledDate={c.scheduledDate ? c.scheduledDate.toISOString() : null}
                    scheduledMonth={c.brief.scheduledMonth.toISOString()}
                  />
                  <ApprovalActions
                    contentId={c.id}
                    currentStatus={c.status}
                    userRole={session!.user.role}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm whitespace-pre-line rounded-lg px-3 py-2 ${
        accent ? 'text-blue-600 bg-blue-50' : muted ? 'text-gray-500 bg-gray-50 italic' : 'text-gray-800 bg-gray-50'
      }`}>
        {value}
      </p>
    </div>
  )
}
