'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  briefPlatformId: string
  hasContent: boolean
  contentId?: string | null
  mediaStatus?: string | null
}

type Mode = 'full' | 'content-only' | 'retry-media'

export default function BriefGenerateButton({ briefPlatformId, hasContent, contentId, mediaStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<Mode | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function generate(mode: Mode) {
    setError('')
    setLoading(mode)
    setOpen(false)

    try {
      if (mode === 'retry-media' && contentId) {
        const res = await fetch('/api/media/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId }),
        })
        if (!res.ok) setError('Media retry failed.')
      } else {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefPlatformId, skipMedia: mode === 'content-only' }),
        })
        if (!res.ok) setError('Generation failed. Try again.')
      }
    } catch {
      setError('Request failed. Try again.')
    }

    setLoading(null)
    router.refresh()
  }

  const busy = loading !== null

  // Determine primary action based on state
  const needsMedia = hasContent && mediaStatus === 'NONE' && !!contentId
  const primaryMode: Mode = !hasContent ? 'content-only' : needsMedia ? 'retry-media' : 'full'

  const primaryLabel = busy
    ? (loading === 'content-only' ? 'Generating text...' : loading === 'retry-media' ? 'Generating media...' : 'Generating...')
    : !hasContent ? 'Generate' : needsMedia ? 'Generate Media' : 'Regenerate All'

  const isBlue = !hasContent || needsMedia
  const btnBase = 'px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'
  const primaryStyle = isBlue
    ? 'bg-blue-600 text-white hover:bg-blue-700 border-r-0'
    : 'text-gray-600 border border-gray-300 hover:border-gray-400 border-r-0'
  const chevronStyle = isBlue
    ? 'bg-blue-600 text-white hover:bg-blue-700 px-2'
    : 'text-gray-600 border border-gray-300 hover:border-gray-400 px-2'

  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={dropdownRef} className="relative flex">
        {/* Primary action */}
        <button
          onClick={() => generate(primaryMode)}
          disabled={busy}
          className={`${btnBase} ${primaryStyle} rounded-l-lg`}
        >
          {primaryLabel}
        </button>

        {/* Chevron trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          disabled={busy}
          className={`${btnBase} ${chevronStyle} rounded-r-lg border-l border-white/30`}
          aria-label="More options"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
            {/* No content: offer Generate All */}
            {!hasContent && (
              <button
                onClick={() => generate('full')}
                className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Generate All
              </button>
            )}

            {/* Has content with no media: offer Regenerate All + Content only */}
            {needsMedia && (
              <>
                <button
                  onClick={() => generate('full')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate All
                </button>
                <button
                  onClick={() => generate('content-only')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  Content only
                </button>
              </>
            )}

            {/* Has content with media: offer Content only + Media only */}
            {hasContent && !needsMedia && (
              <>
                <button
                  onClick={() => generate('content-only')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  Content only
                </button>
                {contentId && (
                  <button
                    onClick={() => generate('retry-media')}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Media only
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
