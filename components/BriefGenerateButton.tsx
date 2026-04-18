'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  briefPlatformId: string
  hasContent: boolean
}

export default function BriefGenerateButton({ briefPlatformId, hasContent }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setError('')
    setLoading(true)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefPlatformId })
    })

    setLoading(false)

    if (!res.ok) {
      setError('Generation failed. Try again.')
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={generate}
        disabled={loading}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
          hasContent
            ? 'text-gray-600 border border-gray-300 hover:border-gray-400'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? 'Generating...' : hasContent ? 'Regenerate' : 'Generate'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
