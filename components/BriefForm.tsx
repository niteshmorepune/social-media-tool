'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORMS, CONTENT_GOALS } from '@/lib/utils'

interface Client { id: string; name: string; primaryColor: string | null }
interface PlatformEntry { platform: string; contentType: 'IMAGE' | 'VIDEO' | 'CAROUSEL' }

export default function BriefForm({ clients }: { clients: Client[] }) {
  const router = useRouter()

  const [form, setForm] = useState({
    clientId:           '',
    title:              '',
    contentGoal:        '',
    campaignDescription:'',
    specialInstructions:'',
    scheduledMonth:     ''
  })
  const [platforms, setPlatforms] = useState<PlatformEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function togglePlatform(platform: string, contentType: 'IMAGE' | 'VIDEO' | 'CAROUSEL') {
    setPlatforms(prev => {
      const exists = prev.find(p => p.platform === platform && p.contentType === contentType)
      if (exists) return prev.filter(p => !(p.platform === platform && p.contentType === contentType))
      return [...prev, { platform, contentType }]
    })
  }

  function isSelected(platform: string, contentType: string) {
    return platforms.some(p => p.platform === platform && p.contentType === contentType)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (platforms.length === 0) {
      setError('Select at least one platform and content type.')
      return
    }
    setError('')
    setSaving(true)

    const res = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduledMonth: form.scheduledMonth + '-01',
        platforms
      })
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return
    }

    const brief = await res.json()
    router.push(`/briefs/${brief.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Brief Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select
            required value={form.clientId} onChange={e => set('clientId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brief Title *</label>
          <input
            required value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. March Product Launch Campaign"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Goal *</label>
            <select
              required value={form.contentGoal} onChange={e => set('contentGoal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select goal...</option>
              {CONTENT_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Month *</label>
            <input
              required type="month" value={form.scheduledMonth} onChange={e => set('scheduledMonth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Brief *</label>
          <p className="text-xs text-gray-400 mb-1.5">What should the posts be about this month? Include key messages, tone, offers, or anything to highlight.</p>
          <textarea
            required rows={4} value={form.campaignDescription} onChange={e => set('campaignDescription', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="e.g. This month focus on our new web design packages. Highlight fast turnaround, affordable pricing, and include a call to action to book a free consultation. Keep the tone friendly and professional."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
          <textarea
            rows={2} value={form.specialInstructions} onChange={e => set('specialInstructions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Any dos and don'ts, specific phrases to include/avoid, competitor references, etc."
          />
        </div>
      </div>

      {/* Platform + content type selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Platforms & Content Types *</h2>
        <p className="text-sm text-gray-500 mb-4">Select one or more combinations. Each will generate separate AI content.</p>

        <div className="space-y-4">
          {PLATFORMS.map(({ value, label, supportsVideo, supportsCarousel }) => (
            <div key={value}>
              <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
              <div className="flex gap-2">
                {(['IMAGE', 'VIDEO', 'CAROUSEL'] as const).map(type => {
                  if (type === 'VIDEO' && !supportsVideo) return null
                  if (type === 'CAROUSEL' && !supportsCarousel) return null
                  const selected = isSelected(value, type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => togglePlatform(value, type)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {platforms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Selected ({platforms.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  {p.platform} · {p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push('/briefs')}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:text-gray-800">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? 'Creating...' : 'Create Brief'}
        </button>
      </div>
    </form>
  )
}
