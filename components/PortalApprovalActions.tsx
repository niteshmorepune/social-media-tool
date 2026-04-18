'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contentId: string
  currentStatus: string
}

export default function PortalApprovalActions({ contentId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function act(action: string, revisionComment?: string) {
    setError('')
    setLoading(true)
    const res = await fetch(`/api/portal/content/${contentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment: revisionComment })
    })
    setLoading(false)
    if (!res.ok) { setError('Something went wrong. Please try again.'); return }
    setDone(true)
    setShowRevision(false)
    router.refresh()
  }

  if (done) {
    return <p className="text-sm text-green-600 font-medium">Response submitted. Thank you!</p>
  }

  if (currentStatus === 'APPROVED') {
    return <p className="text-sm text-green-600 font-medium">You have approved this content.</p>
  }

  const btn = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50'

  return (
    <div className="space-y-3">
      {!showRevision && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => act('APPROVE')}
            disabled={loading}
            className={`${btn} bg-green-600 hover:bg-green-700 text-white`}
          >
            Approve
          </button>
          <button
            onClick={() => setShowRevision(true)}
            disabled={loading}
            className={`${btn} bg-white border border-gray-300 hover:border-gray-400 text-gray-700`}
          >
            Request Revision
          </button>
        </div>
      )}

      {showRevision && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">What would you like changed?</p>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Please describe what you'd like us to change or improve..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowRevision(false); setComment('') }}
              className={`${btn} border border-gray-300 text-gray-600`}
            >
              Cancel
            </button>
            <button
              onClick={() => act('REQUEST_REVISION', comment)}
              disabled={!comment.trim() || loading}
              className={`${btn} bg-orange-600 hover:bg-orange-700 text-white`}
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
