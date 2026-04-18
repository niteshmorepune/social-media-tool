'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  briefId: string
  platformCount: number
}

export default function BulkGenerateButton({ briefId, platformCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ generated: number; errors: string[] } | null>(null)

  async function handleGenerate() {
    if (!confirm(`Generate content for all ${platformCount} platform${platformCount > 1 ? 's' : ''}? Any existing content will be replaced.`)) return

    setResult(null)
    setLoading(true)

    const res = await fetch('/api/generate/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefId })
    })

    setLoading(false)
    const data = await res.json()
    setResult(data)
    if (data.generated > 0) router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating all...
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
