import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import PortalApprovalActions from '@/components/PortalApprovalActions'
import MediaDisplay from '@/components/MediaDisplay'

export default async function PortalPage() {
  const session = await auth()

  const contentList = await prisma.content.findMany({
    where: {
      brief: {
        client: { users: { some: { id: session!.user.id } } }
      }
    },
    include: {
      brief:     { select: { title: true, scheduledMonth: true } },
      revisions: { orderBy: { createdAt: 'desc' }, take: 3, include: { requestedBy: { select: { name: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const pending   = contentList.filter(c => c.status === 'PENDING').length
  const approved  = contentList.filter(c => c.status === 'APPROVED').length
  const revisions = contentList.filter(c => c.status === 'REVISION_REQUESTED').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Content</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve your social media content below.</p>
      </div>

      {/* Summary pills */}
      {contentList.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Pill label="Awaiting review" count={pending}   color="bg-yellow-50 text-yellow-700 border-yellow-200" />
          <Pill label="Approved"        count={approved}  color="bg-green-50 text-green-700 border-green-200" />
          <Pill label="Revisions sent"  count={revisions} color="bg-orange-50 text-orange-700 border-orange-200" />
        </div>
      )}

      {contentList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No content ready for review yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {contentList.map(c => {
            const slides = c.slides as { slideNumber: number; text: string; imagePrompt: string; imageUrl?: string }[] | null

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{c.brief.title}</p>
                    <p className="text-sm text-gray-400">
                      {c.platform} · {c.contentType.charAt(0) + c.contentType.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.mediaStatus === 'GENERATING' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
                        Media generating...
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                </div>

                {/* Generated media */}
                <div className="px-6 pt-5">
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

                {/* Text content */}
                <div className="px-6 pb-5 space-y-4">
                  {c.caption && <PortalField label="Caption" value={c.caption} />}
                  {c.hook && <PortalField label="Hook (Opening)" value={c.hook} highlight />}
                  {c.copy && <PortalField label="Copy" value={c.copy} />}
                  {c.script && <PortalField label="Script" value={c.script} />}
                  {c.onScreenText && <PortalField label="On-Screen Text" value={c.onScreenText} />}
                  {c.hashtags && <PortalField label="Hashtags" value={c.hashtags} accent />}
                  {c.callToAction && <PortalField label="Call to Action" value={c.callToAction} highlight />}
                  {c.duration && (
                    <p className="text-sm text-gray-500">
                      Recommended duration: <strong>{c.duration}</strong>
                    </p>
                  )}
                  {/* Carousel slide text */}
                  {slides && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slide Copy</p>
                      <div className="space-y-2">
                        {slides.map(slide => (
                          <div key={slide.slideNumber} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-xs font-medium text-gray-500 mb-1">Slide {slide.slideNumber}</p>
                            <p className="text-sm text-gray-800">{slide.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Previous revisions */}
                {c.revisions.length > 0 && (
                  <div className="px-6 pb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Previous Feedback</p>
                    <div className="space-y-2">
                      {c.revisions.map(r => (
                        <div key={r.id} className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-sm text-orange-800">
                          {r.comment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <PortalApprovalActions contentId={c.id} currentStatus={c.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${color}`}>
      <span className="font-bold">{count}</span> {label}
    </span>
  )
}

function PortalField({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm whitespace-pre-line rounded-lg px-4 py-3 ${
        accent    ? 'text-blue-700 bg-blue-50' :
        highlight ? 'text-gray-900 bg-gray-50 font-medium' :
                    'text-gray-700 bg-gray-50'
      }`}>
        {value}
      </p>
    </div>
  )
}
