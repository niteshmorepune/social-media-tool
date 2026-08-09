'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PortalUser {
  id: string
  name: string
  email: string
}

export default function ClientPortalLoginsList({ users }: { users: PortalUser[] }) {
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke portal access for ${name}? They will no longer be able to log in.`)) return
    setRevoking(id)
    setError('')
    const res = await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setRevoking(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to revoke access. Try again.')
      return
    }
    router.refresh()
  }

  if (users.length === 0) {
    return <p className="text-sm text-gray-500 mb-4">No portal logins yet.</p>
  }

  return (
    <div className="mb-4">
      <ul className="space-y-2">
        {users.map(u => (
          <li key={u.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{u.name}</p>
                <p className="text-gray-500">{u.email}</p>
              </div>
            </div>
            <button
              onClick={() => handleRevoke(u.id, u.name)}
              disabled={revoking === u.id}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
            >
              {revoking === u.id ? 'Revoking...' : 'Revoke access'}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
    </div>
  )
}
