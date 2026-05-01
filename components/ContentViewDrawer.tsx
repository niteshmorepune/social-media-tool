'use client'

import { useState, useEffect } from 'react'
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

interface ContentData {
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
  content: ContentData
  postNumber: number
  scheduledMonth: string
  userRole: string
}

export default function ContentViewDrawer({ content, postNumber, scheduledMonth, userRole }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline shrink-0"
      >
        View →
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Slide-over drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{content.platform}</p>
                  <span className="text-gray-300">·</span>
                  <p className="text-sm text-gray-500">
                    {content.contentType.charAt(0) + content.contentType.slice(1).toLowerCase()}
                  </p>
                  <span className="text-gray-300">·</span>
                  <p className="text-sm text-gray-500">Post #{postNumber}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {content.mediaStatus === 'READY' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                      Media ready
                    </span>
                  )}
                  {content.mediaStatus === 'GENERATING' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
                      Generating media...
                    </span>
                  )}
                  {content.mediaStatus === 'FAILED' && (
                    <RegenerateMediaButton contentId={content.id} />
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(content.status)}`}>
                    {getStatusLabel(content.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
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
              <MediaDisplay
                contentId={content.id}
                contentType={content.contentType}
                imageUrl={content.imageUrl}
                videoUrl={content.videoUrl}
                thumbnailUrl={content.thumbnailUrl}
                mediaStatus={content.mediaStatus}
                slides={content.slides}
              />

              {content.caption && <Field label="Caption" value={content.caption} />}
              {content.hook && <Field label="Hook (first 3 sec)" value={content.hook} />}
              {content.copy && <Field label="Copy" value={content.copy} />}
              {content.script && <Field label="Script" value={content.script} />}
              {content.onScreenText && <Field label="On-screen Text" value={content.onScreenText} />}
              {content.hashtags && <Field label="Hashtags" value={content.hashtags} accent />}
              {content.callToAction && <Field label="Call to Action" value={content.callToAction} />}
              {content.imagePrompt && <Field label="Image Prompt" value={content.imagePrompt} muted />}
              {content.videoConcept && <Field label="Video Concept" value={content.videoConcept} muted />}
              {content.thumbnailPrompt && <Field label="Thumbnail Prompt" value={content.thumbnailPrompt} muted />}
              {content.duration && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
                  <p className="text-sm text-gray-600">{content.duration}</p>
                </div>
              )}

              {content.slides && content.slides.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slide Copy</p>
                  <div className="space-y-2">
                    {content.slides.map(slide => (
                      <div key={slide.slideNumber} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Slide {slide.slideNumber}</p>
                        <p className="text-sm text-gray-800">{slide.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.revisions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revision Notes</p>
                  <div className="space-y-2">
                    {content.revisions.map(r => (
                      <div key={r.id} className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-yellow-800">{r.requestedBy.name}</p>
                        <p className="text-sm text-yellow-900 mt-0.5">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 shrink-0 space-y-3">
              <ScheduleDatePicker
                contentId={content.id}
                scheduledDate={content.scheduledDate}
                scheduledMonth={scheduledMonth}
              />
              <ApprovalActions
                contentId={content.id}
                currentStatus={content.status}
                userRole={userRole}
              />
            </div>
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
