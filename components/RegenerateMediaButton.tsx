'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegenerateMediaButton({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function retry() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/media/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
        Retry failed — check prompts
      </span>
    )
  }

  return (
    <button
      onClick={retry}
      disabled={loading}
      className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Starting...' : 'Media failed · Retry'}
    </button>
  )
}
