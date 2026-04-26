'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  briefId: string
  platformCount: number
}

export default function BulkGenerateButton({ briefId, platformCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ generated: number; errors: string[] } | null>(null)
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

  async function handleGenerate(skipMedia: boolean) {
    const label = skipMedia ? 'text content' : 'content and media'
    if (!confirm(`Generate ${label} for all ${platformCount} platform${platformCount > 1 ? 's' : ''}? Any existing content will be replaced.`)) return

    setResult(null)
    setLoading(true)
    setOpen(false)

    const res = await fetch('/api/generate/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefId, skipMedia })
    })

    setLoading(false)
    const data = await res.json()
    setResult(data)
    if (data.generated > 0) router.refresh()
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
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating text...
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

      {result && (
        <div className="text-right">
          {result.generated > 0 && (
            <p className="text-xs text-green-600">{result.generated} generated successfully</p>
          )}
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-500">{e}</p>
          ))}
        </div>
      )}
    </div>
  )
}
