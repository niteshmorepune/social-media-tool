'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MediaDisplay from './MediaDisplay'
import ApprovalActions from './ApprovalActions'
import RegenerateMediaButton from './RegenerateMediaButton'
import ScheduleDatePicker from './ScheduleDatePicker'
import { getStatusColor, getStatusLabel, CAPTION_LIMITS } from '@/lib/utils'
import { META_SOFT_LIMITS, GOOGLE_HARD_LIMITS, PolicyFlag } from '@/lib/ad-copy-policy'

interface Revision {
  id: string
  comment: string
  createdAt?: string
  requestedBy: { name: string; role: string }
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
  internalNote: string | null
  slides: Slide[] | null
  revisions: Revision[]
  adPrimaryText: string | null
  adHeadline: string | null
  adDescription: string | null
  adHeadlines: string[] | null
  adDescriptions: string[] | null
  adPaths: string[] | null
  businessName: string | null
  policyFlags: PolicyFlag[] | null
}

interface Props {
  contentId: string
  postNumber: number
  totalPosts: number
  briefPlatformId: string
  scheduledMonth: string
  userRole: string
  // Preview data kept in sync by the server component after router.refresh()
  platform: string
  contentType: string
  status: string
  mediaStatus: string
}

export default function ContentViewDrawer({
  contentId, postNumber, totalPosts, briefPlatformId, scheduledMonth, userRole,
  platform, contentType, status, mediaStatus,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<FullContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [noteText, setNoteText]   = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying]   = useState(false)
  const [replyError, setReplyError] = useState('')

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

  // Sync note text whenever data is (re-)fetched
  useEffect(() => {
    if (data) setNoteText(data.internalNote ?? '')
  }, [data])

  async function saveNote() {
    if (!data) return
    if (noteText === (data.internalNote ?? '')) return
    try {
      await fetch(`/api/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNote: noteText || null }),
      })
      setData(d => d ? { ...d, internalNote: noteText || null } : d)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch { /* silent */ }
  }

  async function handleRegenerate() {
    setRegenError('')
    setRegenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefPlatformId,
          skipMedia: true,
          addPost: true,
          postNumber,
          totalPosts,
          direction: direction.trim() || undefined,
          contentIdToReplace: contentId,
        }),
      })
      if (!res.ok) {
        setRegenError('Regeneration failed. Please try again.')
        return
      }
      close()
      router.refresh()
    } catch {
      setRegenError('Request failed.')
    } finally {
      setRegenerating(false)
    }
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

                  {data.policyFlags && data.policyFlags.length > 0 && <PolicyFlags flags={data.policyFlags} />}

                  {data.adPrimaryText && <Field label="Primary Text" value={data.adPrimaryText} charLimit={META_SOFT_LIMITS.primaryText} softLimit />}
                  {data.adHeadline && <Field label="Headline" value={data.adHeadline} charLimit={META_SOFT_LIMITS.headline} softLimit />}
                  {data.adDescription && <Field label="Description" value={data.adDescription} charLimit={META_SOFT_LIMITS.description} softLimit />}

                  {data.adHeadlines && data.adHeadlines.length > 0 && (
                    <FieldList label="Headlines" values={data.adHeadlines} charLimit={GOOGLE_HARD_LIMITS.headline} />
                  )}
                  {data.adDescriptions && data.adDescriptions.length > 0 && (
                    <FieldList label="Descriptions" values={data.adDescriptions} charLimit={GOOGLE_HARD_LIMITS.description} />
                  )}
                  {data.adPaths && data.adPaths.length > 0 && (
                    <FieldList label="Display Paths" values={data.adPaths} charLimit={GOOGLE_HARD_LIMITS.path} />
                  )}
                  {data.businessName && <Field label="Business Name" value={data.businessName} charLimit={GOOGLE_HARD_LIMITS.businessName} />}

                  {data.caption && <Field label="Caption" value={data.caption} charLimit={CAPTION_LIMITS[platform]} />}
                  {data.hook && <Field label="Hook (first 3 sec)" value={data.hook} />}
                  {data.copy && <Field label="Copy" value={data.copy} />}
                  {data.script && <Field label="Script" value={data.script} />}
                  {data.onScreenText && <Field label="On-screen Text" value={data.onScreenText} />}
                  {data.hashtags && <Field label="Hashtags" value={data.hashtags} accent charLimit={platform === 'Twitter' ? CAPTION_LIMITS['Twitter'] : undefined} />}
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

                  {(data.revisions.length > 0 || data.status === 'REVISION_REQUESTED') && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revision Thread</p>
                      {data.revisions.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {data.revisions.map(r => {
                            const isClient = r.requestedBy.role === 'CLIENT'
                            return (
                              <div key={r.id} className={`rounded-lg px-3 py-2 border ${
                                isClient
                                  ? 'bg-orange-50 border-orange-100'
                                  : 'bg-blue-50 border-blue-100'
                              }`}>
                                <p className={`text-xs font-medium ${isClient ? 'text-orange-700' : 'text-blue-700'}`}>
                                  {r.requestedBy.name} {isClient ? '(Client)' : '(Team)'}
                                </p>
                                <p className={`text-sm mt-0.5 ${isClient ? 'text-orange-900' : 'text-blue-900'}`}>
                                  {r.comment}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Team reply box */}
                      <div className="space-y-1.5">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Reply to client..."
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-blue-50 placeholder-blue-300 text-gray-800"
                          disabled={replying}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!replyText.trim()) return
                              setReplyError('')
                              setReplying(true)
                              try {
                                const res = await fetch(`/api/content/${contentId}/revisions`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ comment: replyText.trim() }),
                                })
                                if (!res.ok) throw new Error()
                                const newRevision = await res.json()
                                setData(d => d ? { ...d, revisions: [...d.revisions, newRevision] } : d)
                                setReplyText('')
                              } catch {
                                setReplyError('Failed to send reply.')
                              } finally {
                                setReplying(false)
                              }
                            }}
                            disabled={!replyText.trim() || replying}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                          >
                            {replying ? 'Sending...' : 'Send Reply'}
                          </button>
                          {replyError && <p className="text-xs text-red-500">{replyError}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Internal note — team only, never shown to client */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Internal Note</p>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Team only</span>
                    </div>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onBlur={saveNote}
                      rows={3}
                      placeholder="Add a private note for the team... (e.g. client wants to post Tuesday, waiting on photo from client)"
                      className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-amber-50 placeholder-amber-300 text-gray-800"
                    />
                    {noteSaved && <p className="text-xs text-green-600 mt-1">Saved</p>}
                  </div>
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
                <div className="pt-1 border-t border-gray-200 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Regenerate Text</p>
                  <div className="flex gap-2">
                    <input
                      value={direction}
                      onChange={e => setDirection(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !regenerating) handleRegenerate() }}
                      placeholder="Direction (optional): e.g. make it shorter, more emotional, focus on the offer..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      disabled={regenerating}
                    />
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {regenerating ? 'Generating...' : '↺ Regenerate'}
                    </button>
                  </div>
                  {regenError && <p className="text-xs text-red-500">{regenError}</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

function Field({ label, value, accent, muted, charLimit, softLimit }: {
  label: string; value: string; accent?: boolean; muted?: boolean; charLimit?: number; softLimit?: boolean
}) {
  const count = value.length
  const pct   = charLimit ? count / charLimit : 0
  // softLimit fields (Meta) are recommendations Meta truncates around, not hard
  // rejections — never shown as red/error the way a Google hard-cap overage is.
  const overColor = softLimit ? 'text-amber-500 font-semibold' : 'text-red-500 font-semibold'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {charLimit && (
          <p className={`text-xs tabular-nums ${
            pct > 1 ? overColor : pct > 0.8 ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {count.toLocaleString()} / {charLimit.toLocaleString()}
            {pct > 1 && ' ⚠'}
          </p>
        )}
      </div>
      <p className={`text-sm whitespace-pre-line rounded-lg px-3 py-2 ${
        accent ? 'text-blue-600 bg-blue-50' : muted ? 'text-gray-500 bg-gray-50 italic' : 'text-gray-800 bg-gray-50'
      }`}>
        {value}
      </p>
    </div>
  )
}

// Google's headline/description/path pools — array of independently-limited strings
function FieldList({ label, values, charLimit }: { label: string; values: string[]; charLimit: number }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="space-y-1">
        {values.map((v, i) => {
          const over = v.length > charLimit
          return (
            <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-1.5">
              <p className="text-sm text-gray-800">{v}</p>
              <p className={`text-xs tabular-nums shrink-0 ${over ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {v.length}/{charLimit}{over && ' ⚠'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Compliance flags from lib/ad-copy-policy.ts — always advisory, human decides
function PolicyFlags({ flags }: { flags: PolicyFlag[] }) {
  const errors = flags.filter(f => f.severity === 'error')
  const warnings = flags.filter(f => f.severity === 'warning')
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Policy Check</p>
      {errors.map((f, i) => (
        <div key={`e${i}`} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
          <span className="font-semibold">Will likely be rejected — </span>{f.message}
        </div>
      ))}
      {warnings.map((f, i) => (
        <div key={`w${i}`} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
          {f.message}
        </div>
      ))}
    </div>
  )
}
