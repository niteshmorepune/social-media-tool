'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ContentItem {
  id: string
  mediaStatus: string
  status: string
  caption: string | null
}

interface Props {
  briefPlatformId: string
  postsCount: number
  contentItems: ContentItem[]
}

type Action = 'fill' | 'fill-with-media' | 'regenerate-all' | 'regenerate-all-with-media' | 'generate-media' | 'content-only'

export default function BriefGenerateButton({ briefPlatformId, postsCount, contentItems }: Props) {
  const router = useRouter()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const existingCount  = contentItems.length
  const postsNeeded    = Math.max(0, postsCount - existingCount)
  const mediaNoneItems = contentItems.filter(c => c.mediaStatus === 'NONE')
  const needsMedia     = postsNeeded === 0 && mediaNoneItems.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function run(action: Action) {
    setError('')
    setOpen(false)

    if (action === 'generate-media') {
      // Generate media for all NONE items sequentially
      setProgress({ current: 0, total: mediaNoneItems.length })
      for (let i = 0; i < mediaNoneItems.length; i++) {
        setProgress({ current: i + 1, total: mediaNoneItems.length })
        try {
          const res = await fetch('/api/media/regenerate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentId: mediaNoneItems[i].id }),
          })
          if (!res.ok) setError('Media generation failed on one or more posts.')
        } catch {
          setError('Request failed.')
        }
        router.refresh()
      }
      setProgress(null)
      return
    }

    const skipMedia = action === 'fill' || action === 'regenerate-all' || action === 'content-only'
    const regenerateAll = action === 'regenerate-all' || action === 'regenerate-all-with-media'

    if (action === 'content-only') {
      // Regenerate all text only (delete all, generate postsCount posts)
      setProgress({ current: 1, total: postsCount })
      try {
        // First call deletes existing
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefPlatformId, skipMedia: true, addPost: false, postNumber: 1, totalPosts: postsCount }),
        })
        router.refresh()
        for (let i = 1; i < postsCount; i++) {
          setProgress({ current: i + 1, total: postsCount })
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ briefPlatformId, skipMedia: true, addPost: true, postNumber: i + 1, totalPosts: postsCount }),
          })
          router.refresh()
        }
      } catch {
        setError('Request failed.')
      }
      setProgress(null)
      return
    }

    if (regenerateAll) {
      // Delete all existing, regenerate all postsCount posts
      const total = postsCount
      setProgress({ current: 1, total })
      try {
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefPlatformId, skipMedia, addPost: false, postNumber: 1, totalPosts: total }),
        })
        router.refresh()
        for (let i = 1; i < total; i++) {
          setProgress({ current: i + 1, total })
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ briefPlatformId, skipMedia, addPost: true, postNumber: i + 1, totalPosts: total }),
          })
          router.refresh()
        }
      } catch {
        setError('Request failed.')
      }
      setProgress(null)
      return
    }

    // Fill remaining posts (fill / fill-with-media)
    const total = postsNeeded
    if (total === 0) return
    setProgress({ current: 1, total })
    try {
      for (let i = 0; i < total; i++) {
        if (i > 0) setProgress({ current: i + 1, total })
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            briefPlatformId,
            skipMedia,
            addPost: true,
            postNumber: existingCount + i + 1,
            totalPosts: postsCount,
          }),
        })
        router.refresh()
      }
    } catch {
      setError('Request failed.')
    }
    setProgress(null)
  }

  const busy = progress !== null

  // ── Determine primary button ──────────────────────────────────────────────
  let primaryAction: Action
  let primaryLabel: string
  let isBlue: boolean

  if (busy) {
    primaryAction = 'fill'
    primaryLabel = progress!.total === 1
      ? 'Generating...'
      : `Generating ${progress!.current} of ${progress!.total}...`
    isBlue = true
  } else if (postsNeeded > 0 && existingCount === 0) {
    primaryAction = 'fill'
    primaryLabel = postsCount === 1 ? 'Generate' : `Generate ${postsCount} Posts`
    isBlue = true
  } else if (postsNeeded > 0) {
    primaryAction = 'fill'
    primaryLabel = `Generate ${postsNeeded} More`
    isBlue = true
  } else if (needsMedia) {
    primaryAction = 'generate-media'
    primaryLabel = mediaNoneItems.length === 1 ? 'Generate Media' : `Generate Media (${mediaNoneItems.length})`
    isBlue = true
  } else {
    primaryAction = 'regenerate-all'
    primaryLabel = 'Regenerate All'
    isBlue = false
  }

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
        <button
          onClick={() => run(primaryAction)}
          disabled={busy}
          className={`${btnBase} ${primaryStyle} rounded-l-lg`}
        >
          {primaryLabel}
        </button>

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

        {open && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
            {/* When posts are incomplete, offer fill-with-media */}
            {postsNeeded > 0 && (
              <button onClick={() => run('fill-with-media')}
                className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {postsNeeded === 1 ? 'Generate with Media' : `Generate ${postsNeeded} More with Media`}
              </button>
            )}

            {/* Regenerate all options */}
            {existingCount > 0 && (
              <>
                <button onClick={() => run('regenerate-all')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate All
                </button>
                <button onClick={() => run('regenerate-all-with-media')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Regenerate All with Media
                </button>
                <button onClick={() => run('content-only')}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  Content only
                </button>
                {mediaNoneItems.length > 0 && (
                  <button onClick={() => run('generate-media')}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
