'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TeamMember { id: string; name: string }
interface Client {
  id: string; name: string; industry: string; brandTone: string
  targetAudience: string; logoUrl?: string | null; website?: string | null
  primaryColor?: string | null; assignedToId?: string | null
}

interface Props {
  client?: Client
  teamMembers: TeamMember[]
}

const INDUSTRIES = [
  'Retail & E-commerce', 'Food & Beverage', 'Health & Wellness', 'Beauty & Fashion',
  'Real Estate', 'Education', 'Technology', 'Finance & Insurance',
  'Travel & Hospitality', 'Professional Services', 'Non-profit', 'Entertainment',
  'Automotive', 'Construction & Home', 'Healthcare', 'Other'
]

export default function ClientForm({ client, teamMembers }: Props) {
  const router = useRouter()
  const isEdit = !!client

  const [form, setForm] = useState({
    name:           client?.name ?? '',
    industry:       client?.industry ?? '',
    brandTone:      client?.brandTone ?? '',
    targetAudience: client?.targetAudience ?? '',
    logoUrl:        client?.logoUrl ?? '',
    website:        client?.website ?? '',
    primaryColor:   client?.primaryColor ?? '#3B82F6',
    assignedToId:   client?.assignedToId ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url    = isEdit ? `/api/clients/${client!.id}` : '/api/clients'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        logoUrl:      form.logoUrl      || null,
        website:      form.website      || null,
        assignedToId: form.assignedToId || null
      })
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return
    }

    router.push('/clients')
    router.refresh()
  }

  async function handleDelete() {
    if (!client) return
    if (!confirm(`Delete ${client.name}? This will remove all their briefs and content.`)) return

    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/clients')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
          <input
            required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Corp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
          <select
            required value={form.industry} onChange={e => set('industry', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url" value={form.website} onChange={e => set('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Tone *</label>
        <textarea
          required rows={3} value={form.brandTone} onChange={e => set('brandTone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="e.g. Professional yet approachable, uses humour sparingly, avoids jargon, speaks directly to busy professionals..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
        <textarea
          required rows={3} value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="e.g. Small business owners aged 30–50, primarily in India, interested in digital marketing and growth..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            type="url" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Colour</label>
          <div className="flex items-center gap-2">
            <input
              type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
              className="h-9 w-12 rounded border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#3B82F6"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Team Member</label>
        <select
          value={form.assignedToId} onChange={e => set('assignedToId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Unassigned</option>
          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex items-center justify-between pt-2">
        {isEdit ? (
          <button
            type="button" onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete client
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <button
            type="button" onClick={() => router.push('/clients')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </div>
    </form>
  )
}
