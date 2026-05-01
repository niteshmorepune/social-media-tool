'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteBriefButton({ briefId }: { briefId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleDelete() {
    setLoading(true)
    setError(false)
    const res = await fetch(`/api/briefs/${briefId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/briefs')
    } else {
      setLoading(false)
      setError(true)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">Delete brief and all its content?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Deleting...' : 'Yes, Delete'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(false) }}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 rounded-lg disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">Delete failed — try again.</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
    >
      Delete Brief
    </button>
  )
}
