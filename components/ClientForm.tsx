'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TeamMember { id: string; name: string }
interface Client {
  id: string; name: string; industry: string; brandTone: string
  targetAudience: string; logoUrl?: string | null; website?: string | null
  primaryColor?: string | null; assignedToId?: string | null
  brandKeywords?: string | null; contentDos?: string | null
  contentDonts?: string | null; competitorsToAvoid?: string | null
  preferredHashtags?: string | null
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

const TONE_CHIPS = [
  'Professional', 'Friendly', 'Witty', 'Warm', 'Direct', 'Authoritative',
  'Playful', 'Inspirational', 'Educational', 'Conversational', 'Bold',
  'Empathetic', 'Energetic', 'Trustworthy', 'Minimalist'
]

export default function ClientForm({ client, teamMembers }: Props) {
  const router = useRouter()
  const isEdit = !!client

  const [form, setForm] = useState({
    name:               client?.name               ?? '',
    industry:           client?.industry           ?? '',
    brandTone:          client?.brandTone          ?? '',
    targetAudience:     client?.targetAudience     ?? '',
    logoUrl:            client?.logoUrl            ?? '',
    website:            client?.website            ?? '',
    primaryColor:       client?.primaryColor       ?? '#3B82F6',
    assignedToId:       client?.assignedToId       ?? '',
    brandKeywords:      client?.brandKeywords      ?? '',
    contentDos:         client?.contentDos         ?? '',
    contentDonts:       client?.contentDonts       ?? '',
    competitorsToAvoid: client?.competitorsToAvoid ?? '',
    preferredHashtags:  client?.preferredHashtags  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customKw, setCustomKw] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const activeKeywords = form.brandKeywords
    ? form.brandKeywords.split(',').map(s => s.trim()).filter(Boolean)
    : []

  function toggleKeyword(kw: string) {
    const s = new Set(activeKeywords)
    if (s.has(kw)) s.delete(kw)
    else s.add(kw)
    set('brandKeywords', [...s].join(', '))
  }

  function removeKeyword(kw: string) {
    const s = new Set(activeKeywords)
    s.delete(kw)
    set('brandKeywords', [...s].join(', '))
  }

  function addCustomKeyword() {
    const candidates = customKw.split(',').map(s => s.trim()).filter(Boolean)
    if (!candidates.length) return
    const s = new Set(activeKeywords)
    candidates.forEach(c => s.add(c))
    set('brandKeywords', [...s].join(', '))
    setCustomKw('')
  }

  const customKeywords = activeKeywords.filter(k => !TONE_CHIPS.includes(k))

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
        logoUrl:            form.logoUrl            || null,
        website:            form.website            || null,
        assignedToId:       form.assignedToId       || null,
        brandKeywords:      form.brandKeywords      || null,
        contentDos:         form.contentDos         || null,
        contentDonts:       form.contentDonts       || null,
        competitorsToAvoid: form.competitorsToAvoid || null,
        preferredHashtags:  form.preferredHashtags  || null,
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
      return
    }

    const data = await res.json().catch(() => null)
    setError(data?.error ?? 'Delete failed — try again.')
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

      {/* ── Brand Voice Profile ─────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Brand Voice Profile</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Injected into every AI generation for this client. All fields optional — fill in what you know.
          </p>
        </div>

        {/* Tone Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tone Keywords</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {TONE_CHIPS.map(chip => (
              <button
                key={chip} type="button" onClick={() => toggleKeyword(chip)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  activeKeywords.includes(chip)
                    ? 'bg-blue-100 text-blue-700 border-blue-300 font-medium'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {customKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {customKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {kw}
                  <button
                    type="button" onClick={() => removeKeyword(kw)}
                    className="ml-0.5 text-purple-400 hover:text-purple-700 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={customKw}
              onChange={e => setCustomKw(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomKeyword() } }}
              placeholder="Custom keyword (press Enter to add)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button" onClick={addCustomKeyword}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Always Do / Never Do */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="inline-flex items-center gap-1">
                <span className="text-green-600 font-bold">+</span> Always Do
              </span>
            </label>
            <textarea
              rows={5} value={form.contentDos} onChange={e => set('contentDos', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={"Use 'you' and 'your'\nInclude a stat or fact\nTell a short story\nEnd with a question\nSpeak in first person"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="inline-flex items-center gap-1">
                <span className="text-red-500 font-bold">&minus;</span> Never Do
              </span>
            </label>
            <textarea
              rows={5} value={form.contentDonts} onChange={e => set('contentDonts', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={"Use industry jargon\nUse excessive exclamation marks\nMake exaggerated claims\nSound salesy or pushy\nUse passive voice"}
            />
          </div>
        </div>

        {/* Competitors & Hashtags */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Competitors to Avoid Resembling</label>
            <input
              value={form.competitorsToAvoid} onChange={e => set('competitorsToAvoid', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brand A, Brand B, ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Hashtags</label>
            <input
              value={form.preferredHashtags} onChange={e => set('preferredHashtags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#yourbrand #industry #topic"
            />
          </div>
        </div>
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
