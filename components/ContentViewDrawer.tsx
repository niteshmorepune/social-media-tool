'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import MediaDisplay from './MediaDisplay'
import ApprovalActions from './ApprovalActions'
import RegenerateMediaButton from './RegenerateMediaButton'
import ScheduleDatePicker from './ScheduleDatePicker'
import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface Revision {
  id: string
  comment: string
  requestedBy: { name: string }
}

interface Slide {
  slideNumber: number
  text: string
  imagePrompt: string
  imageUrl?: string
}

interface FullContent {
  id: string
  platform: string
  contentType: string
  status: string
  scheduledDate: string | null
  caption: string | null
  copy: string | null
  hook: string | null
  script: string | null
  onScreenText: string | null
  hashtags: string | null
  callToAction: string | null
  imagePrompt: string | null
  videoConcept: string | null
  thumbnailPrompt: string | null
  duration: string | null
  imageUrl: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  mediaStatus: string
  slides: Slide[] | null
  revisions: Revision[]
}

interface Props {
  contentId: string
  postNumber: number
  scheduledMonth: string
  userRole: string
  // Preview data kept in sync by the server component after router.refresh()
  platform: string
  contentType: string
  status: string
  mediaStatus: string
}

export default function ContentViewDrawer({
  contentId, postNumber, scheduledMonth, userRole,
  platform, contentType, status, mediaStatus,
}: Props) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<FullContent | null>(null)
  const [loading, setLoading] = useState(false)

  // Track previous status/mediaStatus so we can re-fetch when they change while open
  const prevStatusRef = useRef(status)
  const prevMediaStatusRef = useRef(mediaStatus)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/content/${contentId}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [contentId])

  // Fetch fresh data every time the drawer opens
  useEffect(() => {
    if (!open) return
    fetchData()
  }, [open, fetchData])

  // Re-fetch when parent's status/mediaStatus props change while drawer is open
  // (happens after router.refresh() triggered by child action components)
  useEffect(() => {
    const statusChanged = status !== prevStatusRef.current
    const mediaStatusChanged = mediaStatus !== prevMediaStatusRef.current
    prevStatusRef.current = status
    prevMediaStatusRef.current = mediaStatus
    if (open && (statusChanged || mediaStatusChanged)) fetchData()
  }, [status, mediaStatus, open, fetchData])

  // Slide-in animation: mount → next frame → visible
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Keyboard close + body scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  function openDrawer() {
    setOpen(true)
  }

  function close() {
    setVisible(false)
    setTimeout(() => setOpen(false), 280)
  }

  // Show header badges from live fetched data if available, else from props
  const displayStatus = data?.status ?? status
  const displayMediaStatus = data?.mediaStatus ?? mediaStatus

  return (
    <>
      <button
        onClick={openDrawer}
        className="text-xs text-blue-600 hover:underline shrink-0"
      >
        View →
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            onClick={close}
          />

          {/* Drawer */}
          <div
            className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{platform}</p>
                  <span className="text-gray-300">·</span>
                  <p className="text-sm text-gray-500">
                    {contentType.charAt(0) + contentType.slice(1).toLowerCase()}
                  </p>
                  <span className="text-gray-300">·</span>
                  <p className="text-sm text-gray-500">Post #{postNumber}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {displayMediaStatus === 'READY' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                      Media ready
                    </span>
                  )}
                  {displayMediaStatus === 'GENERATING' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
                      Generating media...
                    </span>
                  )}
                  {displayMediaStatus === 'FAILED' && (
                    <RegenerateMediaButton contentId={contentId} />
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(displayStatus)}`}>
                    {getStatusLabel(displayStatus)}
                  </span>
                </div>
              </div>
              <button
                onClick={close}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loading && !data && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {data && (
                <>
                  <MediaDisplay
                    contentId={data.id}
                    contentType={data.contentType}
                    imageUrl={data.imageUrl}
                    videoUrl={data.videoUrl}
                    thumbnailUrl={data.thumbnailUrl}
                    mediaStatus={data.mediaStatus}
                    slides={data.slides}
                  />

                  {data.caption && <Field label="Caption" value={data.caption} />}
                  {data.hook && <Field label="Hook (first 3 sec)" value={data.hook} />}
                  {data.copy && <Field label="Copy" value={data.copy} />}
                  {data.script && <Field label="Script" value={data.script} />}
                  {data.onScreenText && <Field label="On-screen Text" value={data.onScreenText} />}
                  {data.hashtags && <Field label="Hashtags" value={data.hashtags} accent />}
                  {data.callToAction && <Field label="Call to Action" value={data.callToAction} />}
                  {data.imagePrompt && <Field label="Image Prompt" value={data.imagePrompt} muted />}
                  {data.videoConcept && <Field label="Video Concept" value={data.videoConcept} muted />}
                  {data.thumbnailPrompt && <Field label="Thumbnail Prompt" value={data.thumbnailPrompt} muted />}
                  {data.duration && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-sm text-gray-600">{data.duration}</p>
                    </div>
                  )}

                  {data.slides && data.slides.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slide Copy</p>
                      <div className="space-y-2">
                        {data.slides.map(slide => (
                          <div key={slide.slideNumber} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Slide {slide.slideNumber}</p>
                            <p className="text-sm text-gray-800">{slide.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.revisions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revision Notes</p>
                      <div className="space-y-2">
                        {data.revisions.map(r => (
                          <div key={r.id} className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium text-yellow-800">{r.requestedBy.name}</p>
                            <p className="text-sm text-yellow-900 mt-0.5">{r.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer actions — only when data is loaded */}
            {data && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 shrink-0 space-y-3">
                <ScheduleDatePicker
                  contentId={contentId}
                  scheduledDate={data.scheduledDate}
                  scheduledMonth={scheduledMonth}
                />
                <ApprovalActions
                  contentId={contentId}
                  currentStatus={data.status}
                  userRole={userRole}
                />
              </div>
            )}
          </div>
        </>
      )}
    </>
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
