'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  platforms: { id: string }[]
}

export default function BulkGenerateButton({ platforms }: Props) {
  const router = useRouter()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loading = progress !== null
  const platformCount = platforms.length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleGenerate(skipMedia: boolean) {
    const label = skipMedia ? 'text content' : 'content and media'
    if (!confirm(`Generate ${label} for all ${platformCount} platform${platformCount > 1 ? 's' : ''}? Any existing content will be replaced.`)) return

    setErrors([])
    setOpen(false)
    const errs: string[] = []

    for (let i = 0; i < platforms.length; i++) {
      setProgress({ current: i + 1, total: platforms.length })

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefPlatformId: platforms[i].id, skipMedia }),
        })
        if (!res.ok) errs.push(`Platform ${i + 1}: generation failed`)
      } catch {
        errs.push(`Platform ${i + 1}: request failed`)
      }

      router.refresh()
    }

    setProgress(null)
    setErrors(errs)
  }

  const btnBase = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'

  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={dropdownRef} className="relative flex">
        {/* Primary: text only */}
        <button
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className={`${btnBase} bg-purple-600 hover:bg-purple-700 text-white rounded-l-lg`}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating {progress!.current} of {progress!.total}...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Generate All ({platformCount})
            </>
          )}
        </button>

        {/* Chevron */}
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

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
            <button
              onClick={() => handleGenerate(false)}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generate All with Media
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
