'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalCommentBox({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

  async function send() {
    if (!text.trim()) return
    setError('')
    setSending(true)
    try {
      const res = await fetch(`/api/portal/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMMENT', comment: text.trim() }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      setText('')
      router.refresh()
    } catch {
      setError('Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return <p className="text-sm text-orange-600 font-medium">Comment added.</p>
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={2}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add another comment..."
        className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-orange-50 placeholder-orange-300 text-gray-800"
        disabled={sending}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {sending ? 'Sending...' : 'Add Comment'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
