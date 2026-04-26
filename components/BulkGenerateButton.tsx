'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PlatformInfo {
  id: string
  postsCount: number
  existingCount: number
}

interface Props {
  platforms: PlatformInfo[]
}

export default function BulkGenerateButton({ platforms }: Props) {
  const router = useRouter()
  const [progress, setProgress] = useState<{ label: string; current: number; total: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loading = progress !== null
  const totalNeeded = platforms.reduce((s, p) => s + Math.max(0, p.postsCount - p.existingCount), 0)
  const totalPosts  = platforms.reduce((s, p) => s + p.postsCount, 0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleGenerate(skipMedia: boolean, regenerateAll: boolean) {
    const modeLabel = skipMedia ? 'text content' : 'content and media'
    const scopeLabel = regenerateAll ? `all ${totalPosts} posts` : `${totalNeeded} remaining post${totalNeeded !== 1 ? 's' : ''}`
    if (!confirm(`Generate ${modeLabel} for ${scopeLabel} across all platforms? ${regenerateAll ? 'Existing content will be replaced.' : ''}`)) return

    setErrors([])
    setOpen(false)
    const errs: string[] = []
    let globalCurrent = 0
    const globalTotal = regenerateAll ? totalPosts : totalNeeded

    for (const p of platforms) {
      const startFrom    = regenerateAll ? 0 : p.existingCount
      const generateCount = regenerateAll ? p.postsCount : Math.max(0, p.postsCount - p.existingCount)
      if (generateCount === 0) continue

      for (let i = 0; i < generateCount; i++) {
        globalCurrent++
        setProgress({ label: `post ${globalCurrent} of ${globalTotal}`, current: globalCurrent, total: globalTotal })

        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              briefPlatformId: p.id,
              skipMedia,
              addPost: regenerateAll ? i > 0 : true,
              postNumber: startFrom + i + 1,
              totalPosts: p.postsCount,
            }),
          })
          if (!res.ok) errs.push(`Platform ${p.id} post ${i + 1}: failed`)
        } catch {
          errs.push(`Platform ${p.id} post ${i + 1}: request error`)
        }

        router.refresh()
      }
    }

    setProgress(null)
    setErrors(errs)
  }

  const btnBase = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'

  const primaryLabel = loading
    ? `Generating ${progress!.label}...`
    : totalNeeded > 0
    ? `Generate All (${totalNeeded} posts)`
    : `Regenerate All (${totalPosts} posts)`

  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={dropdownRef} className="relative flex">
        <button
          onClick={() => handleGenerate(true, totalNeeded === 0)}
          disabled={loading}
          className={`${btnBase} bg-purple-600 hover:bg-purple-700 text-white rounded-l-lg`}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {primaryLabel}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {primaryLabel}
            </>
          )}
        </button>

        <button
          onClick={() => setOpen(o => !o)}
          disabled={loading}
          className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-lg border-l border-white/30 disabled:opacity-50 transition-colors"
          aria-label="More options"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
            {totalNeeded > 0 && (
              <button onClick={() => handleGenerate(false, false)}
                className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Generate {totalNeeded} posts with Media
              </button>
            )}
            <button onClick={() => handleGenerate(true, true)}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate all {totalPosts} posts
            </button>
            <button onClick={() => handleGenerate(false, true)}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Regenerate all with Media
            </button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="text-right">
          {errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
        </div>
      )}
    </div>
  )
}
