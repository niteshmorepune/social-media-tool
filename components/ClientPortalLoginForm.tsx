'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientPortalLoginForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    // Create user with CLIENT role linked to this client
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'CLIENT', clientId })
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create login')
      return
    }

    setSuccess(`Portal login created for ${form.email}`)
    setForm({ name: '', email: '', password: '' })
    setShow(false)
    router.refresh()
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        + Add portal login
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-700">New portal login</p>
      <input
        required placeholder="Contact name" value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        required type="email" placeholder="Email address" value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        required type="password" placeholder="Password" value={form.password} minLength={8}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setShow(false)}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Login'}
        </button>
      </div>
    </form>
  )
}
