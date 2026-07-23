import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getStatusColor, getStatusLabel, formatMonth } from '@/lib/utils'
import PortalApprovalActions from '@/components/PortalApprovalActions'
import PortalCommentBox from '@/components/PortalCommentBox'
import PlatformMockup from '@/components/PlatformMockup'

export default async function PortalPage() {
  const session = await auth()

  const contentList = await prisma.content.findMany({
    where: {
      brief: {
        client: { users: { some: { id: session!.user.id } } }
      }
    },
    include: {
      brief: {
        select: {
          id:             true,
          title:          true,
          scheduledMonth: true,
          client:         { select: { name: true } }
        }
      },
      revisions: {
        orderBy: { createdAt: 'asc' },
        include: { requestedBy: { select: { name: true, role: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Overall summary
  const totalPending   = contentList.filter(c => c.status === 'PENDING').length
  const totalApproved  = contentList.filter(c => c.status === 'APPROVED').length
  const totalRevisions = contentList.filter(c => c.status === 'REVISION_REQUESTED').length

  // Group by brief
  const briefMap = new Map<string, {
    briefId: string
    title: string
    scheduledMonth: Date
    items: typeof contentList
  }>()

  for (const c of contentList) {
    const key = c.brief.id
    if (!briefMap.has(key)) {
      briefMap.set(key, {
        briefId:        c.brief.id,
        title:          c.brief.title,
        scheduledMonth: c.brief.scheduledMonth,
        items:          [],
      })
    }
    briefMap.get(key)!.items.push(c)
  }

  const briefGroups = [...briefMap.values()]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Content</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve your social media content below.</p>
      </div>

      {/* Overall summary pills */}
      {contentList.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8">
          <Pill label="Awaiting review"  count={totalPending}   color="bg-yellow-50 text-yellow-700 border-yellow-200" />
          <Pill label="Approved"         count={totalApproved}  color="bg-green-50 text-green-700 border-green-200" />
          <Pill label="Revisions sent"   count={totalRevisions} color="bg-orange-50 text-orange-700 border-orange-200" />
        </div>
      )}

      {contentList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No content ready for review yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {briefGroups.map(group => {
            const gApproved  = group.items.filter(c => c.status === 'APPROVED').length
            const gPending   = group.items.filter(c => c.status === 'PENDING').length
            const gRevisions = group.items.filter(c => c.status === 'REVISION_REQUESTED').length
            const gTotal     = group.items.length
            const pct        = gTotal > 0 ? Math.round((gApproved / gTotal) * 100) : 0

            return (
              <div key={group.briefId}>
                {/* Brief header + progress */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">{group.title}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">{formatMonth(group.scheduledMonth)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-gray-900">{pct}%</p>
                      <p className="text-xs text-gray-400">{gApproved} of {gTotal} approved</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-2">
                    {gPending > 0 && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                        {gPending} awaiting review
                      </span>
                    )}
                    {gApproved > 0 && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        {gApproved} approved
                      </span>
                    )}
                    {gRevisions > 0 && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {gRevisions} revision sent
                      </span>
                    )}
                  </div>
                </div>

                {/* Content cards for this brief */}
                <div className="space-y-5 pl-4 border-l-2 border-gray-100">
                  {group.items.map(c => {
                    const slides = c.slides as { slideNumber: number; text: string; imagePrompt: string; imageUrl?: string; altText?: string }[] | null

                    return (
                      <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                          <p className="text-sm text-gray-600 font-medium">
                            {c.platform} · {c.contentType.charAt(0) + c.contentType.slice(1).toLowerCase()}
                          </p>
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

                        {/* Platform mockup preview */}
                        <div className="bg-gray-50 px-6 py-6 border-b border-gray-100">
                          <PlatformMockup
                            platform={c.platform}
                            contentType={c.contentType}
                            clientName={c.brief.client.name}
                            title={c.title}
                            caption={c.caption}
                            hashtags={c.hashtags}
                            callToAction={c.callToAction}
                            imageUrl={c.imageUrl}
                            videoUrl={c.videoUrl}
                            thumbnailUrl={c.thumbnailUrl}
                            mediaStatus={c.mediaStatus}
                            slides={slides}
                            altText={c.altText}
                            adPrimaryText={c.adPrimaryText}
                            adAngle={c.adAngle}
                            adHeadline={c.adHeadline}
                            adDescription={c.adDescription}
                            adHeadlines={c.adHeadlines as string[] | null}
                            adDescriptions={c.adDescriptions as string[] | null}
                          />
                        </div>

                        {/* Supporting text content */}
                        <div className="px-6 pb-5 space-y-4 pt-4">
                          {c.hook && <PortalField label="Hook (Opening)" value={c.hook} highlight />}
                          {c.copy && <PortalField label="Copy" value={c.copy} />}
                          {c.script && <PortalField label="Script" value={c.script} />}
                          {c.onScreenText && <PortalField label="On-Screen Text" value={c.onScreenText} />}
                          {c.callToAction && <PortalField label="Call to Action" value={c.callToAction} highlight />}
                          {c.duration && (
                            <p className="text-sm text-gray-500">
                              Recommended duration: <strong>{c.duration}</strong>
                            </p>
                          )}
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

                        {/* Revision thread */}
                        {c.revisions.length > 0 && (
                          <div className="px-6 pb-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Feedback Thread</p>
                            <div className="space-y-2">
                              {c.revisions.map(r => {
                                const isClient = r.requestedBy.role === 'CLIENT'
                                return (
                                  <div key={r.id} className={`rounded-lg px-3 py-2 border ${
                                    isClient
                                      ? 'bg-orange-50 border-orange-100'
                                      : 'bg-blue-50 border-blue-100'
                                  }`}>
                                    <p className={`text-xs font-medium mb-0.5 ${isClient ? 'text-orange-700' : 'text-blue-700'}`}>
                                      {isClient ? 'You' : r.requestedBy.name + ' (Team)'}
                                    </p>
                                    <p className={`text-sm ${isClient ? 'text-orange-900' : 'text-blue-900'}`}>
                                      {r.comment}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Client can add more comments if revision is already sent */}
                        {c.status === 'REVISION_REQUESTED' && (
                          <div className="px-6 pb-4">
                            <PortalCommentBox contentId={c.id} />
                          </div>
                        )}

                        {/* Downloads for approved content */}
                        {c.status === 'APPROVED' && (c.imageUrl || c.videoUrl) && (
                          <div className="px-6 pb-4 flex flex-wrap gap-2">
                            {c.imageUrl && (
                              <DownloadLink
                                url={c.imageUrl}
                                filename={`${c.platform}-image`}
                                label="Download Image"
                              />
                            )}
                            {c.videoUrl && (
                              <DownloadLink
                                url={c.videoUrl}
                                filename={`${c.platform}-video`}
                                label="Download Video"
                              />
                            )}
                            {c.thumbnailUrl && (
                              <DownloadLink
                                url={c.thumbnailUrl}
                                filename={`${c.platform}-thumbnail`}
                                label="Download Thumbnail"
                              />
                            )}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DownloadLink({ url, filename, label }: { url: string; filename: string; label: string }) {
  const href = url.replace('/upload/', `/upload/fl_attachment:${filename}/`)
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </a>
  )
}

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${color}`}>
      <span className="font-bold">{count}</span> {label}
    </span>
  )
}

function PortalField({ label, value, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm whitespace-pre-line rounded-lg px-4 py-3 ${
        highlight ? 'text-gray-900 bg-gray-50 font-medium' : 'text-gray-700 bg-gray-50'
      }`}>
        {value}
      </p>
    </div>
  )
}
