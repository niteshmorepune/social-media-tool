'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegenerateMediaButton({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function retry() {
    setLoading(true)
    await fetch('/api/media/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId })
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={retry}
      disabled={loading}
      className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Retrying...' : 'Media failed · Retry'}
    </button>
  )
}
