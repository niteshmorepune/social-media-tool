'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DuplicateBriefButton({ briefId }: { briefId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDuplicate() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { id } = await res.json()
      router.push(`/briefs/${id}`)
    } catch {
      setError('Failed to duplicate. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleDuplicate}
        disabled={loading}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        title="Duplicate this brief to next month"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {loading ? 'Duplicating...' : 'Duplicate to next month'}
      </button>
      {error && <p className="absolute top-full mt-1 text-xs text-red-500 whitespace-nowrap">{error}</p>}
    </div>
  )
}
