'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MediaDisplay from './MediaDisplay'
import ApprovalActions from './ApprovalActions'
import RegenerateMediaButton from './RegenerateMediaButton'
import ScheduleDatePicker from './ScheduleDatePicker'
import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface Slide {
  slideNumber: number
  text: string
  imagePrompt: string
  imageUrl?: string
}

interface SerializedContent {
  id: string
  platform: string
  contentType: string
  status: string
  mediaStatus: string
  scheduledDate: string | null
  caption: string | null
  hook: string | null
  copy: string | null
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
  slides: Slide[] | null
  brief: {
    title: string
    scheduledMonth: string
    client: { name: string; assignedToId: string | null }
  }
  revisions: { id: string; comment: string; requestedBy: { name: string } }[]
}

interface Props {
  contentList: SerializedContent[]
  userRole: string
}

export default function ApprovalsContent({ contentList, userRole }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [bulkError, setBulkError] = useState('')

  // Only items that can be acted on are eligible for selection
  const eligibleIds = contentList
    .filter(c => c.status === 'PENDING' || c.status === 'REVISION_REQUESTED')
    .map(c => c.id)

  function toggleAll() {
    if (selected.size === eligibleIds.length && eligibleIds.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(eligibleIds))
    }
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkAction(action: 'APPROVE' | 'REJECT') {
    if (selected.size === 0) return
    setBulkError('')
    const ids = [...selected]
    try {
      const res = await fetch('/api/content/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      })
      if (!res.ok) throw new Error()
      setSelected(new Set())
      startTransition(() => router.refresh())
    } catch {
      setBulkError('Bulk action failed. Please try again.')
    }
  }

  const allEligibleSelected = eligibleIds.length > 0 && selected.size === eligibleIds.length

  return (
    <>
      {/* Bulk action bar — shown when items are selected */}
      {eligibleIds.length > 0 && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
          selected.size > 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allEligibleSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-gray-600 font-medium">
              {selected.size > 0
                ? `${selected.size} selected`
                : `Select all pending (${eligibleIds.length})`}
            </span>
          </label>

          {selected.size > 0 && (
            <>
              <div className="h-4 w-px bg-gray-300" />
              <button
                onClick={() => bulkAction('APPROVE')}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {pending ? 'Updating...' : `✓ Approve ${selected.size}`}
              </button>
              <button
                onClick={() => bulkAction('REJECT')}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {pending ? 'Updating...' : `✕ Reject ${selected.size}`}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1"
              >
                Clear
              </button>
              {bulkError && <p className="text-xs text-red-500 ml-2">{bulkError}</p>}
            </>
          )}
        </div>
      )}

      <div className="space-y-4">
        {contentList.map(c => {
          const isEligible = eligibleIds.includes(c.id)
          const isChecked = selected.has(c.id)

          return (
            <div
              key={c.id}
              className={`bg-white rounded-xl border overflow-hidden transition-colors ${
                isChecked ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                {isEligible && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(c.id)}
                    className="w-4 h-4 rounded accent-blue-600 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
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

              {/* Media */}
              <div className="px-6 pt-4">
                <MediaDisplay
                  contentId={c.id}
                  contentType={c.contentType}
                  imageUrl={c.imageUrl}
                  videoUrl={c.videoUrl}
                  thumbnailUrl={c.thumbnailUrl}
                  mediaStatus={c.mediaStatus}
                  slides={c.slides}
                />
              </div>

              {/* Text fields */}
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
                {c.slides && c.slides.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slide Copy</p>
                    <div className="space-y-2">
                      {c.slides.map(slide => (
                        <div key={slide.slideNumber} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Slide {slide.slideNumber}</p>
                          <p className="text-sm text-gray-800">{slide.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Revisions */}
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
                  scheduledDate={c.scheduledDate}
                  scheduledMonth={c.brief.scheduledMonth}
                />
                <ApprovalActions
                  contentId={c.id}
                  currentStatus={c.status}
                  userRole={userRole}
                />
              </div>
            </div>
          )
        })}
      </div>
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
