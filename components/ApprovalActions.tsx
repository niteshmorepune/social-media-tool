'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contentId: string
  currentStatus: string
  userRole: string
}

export default function ApprovalActions({ contentId, currentStatus, userRole: _userRole }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function act(action: string, comment?: string) {
    setError('')
    setLoading(true)
    const res = await fetch(`/api/content/${contentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment })
    })
    setLoading(false)
    if (!res.ok) { setError('Action failed. Try again.'); return }
    setNote('')
    setShowNote(false)
    router.refresh()
  }

  const btn = 'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus !== 'APPROVED' && (
          <button
            onClick={() => act('APPROVE')}
            disabled={loading}
            className={`${btn} bg-green-600 hover:bg-green-700 text-white`}
          >
            Approve Internally
          </button>
        )}

        {currentStatus !== 'REJECTED' && (
          <button
            onClick={() => act('REJECT')}
            disabled={loading}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Reject
          </button>
        )}

        <button
          onClick={() => act('SEND_TO_CLIENT')}
          disabled={loading}
          className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
        >
          Send to Client
        </button>

        <button
          onClick={() => setShowNote(v => !v)}
          disabled={loading}
          className={`${btn} text-gray-600 border border-gray-300 hover:border-gray-400`}
        >
          Add Note
        </button>
      </div>

      {showNote && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Internal note or revision instruction..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => act('APPROVE', note)}
            disabled={!note.trim() || loading}
            className={`${btn} bg-gray-800 hover:bg-gray-900 text-white`}
          >
            Save
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
