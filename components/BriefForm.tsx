'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORMS, CONTENT_GOALS } from '@/lib/utils'

interface Client { id: string; name: string; primaryColor: string | null }
type ContentTypeChoice = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'AD_COPY' | 'BLOG_POST' | 'LANDING_PAGE'
// targetKeywords is index-aligned with postsCount: targetKeywords[0] is post
// 1's keyword, [1] is post 2's, etc. — kept in sync with postsCount so every
// planned post has its own (possibly blank, meaning "let AI choose") slot.
interface PlatformEntry { platform: string; contentType: ContentTypeChoice; postsCount: number; finalUrl?: string; targetKeywords?: string[] }

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
  // Scratch space for the "paste one keyword per line" box, keyed by
  // platform+contentType — separate from the committed targetKeywords array
  // so typing/pasting doesn't fill fields until "Fill in" is clicked.
  const [keywordPasteDrafts, setKeywordPasteDrafts] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function togglePlatform(platform: string, contentType: ContentTypeChoice) {
    setPlatforms(prev => {
      const exists = prev.find(p => p.platform === platform && p.contentType === contentType)
      if (exists) return prev.filter(p => !(p.platform === platform && p.contentType === contentType))
      const defaults = contentType === 'AD_COPY'
        ? { postsCount: 2, finalUrl: '' }
        : contentType === 'BLOG_POST' || contentType === 'LANDING_PAGE'
        ? { postsCount: 1, targetKeywords: [''] }
        : { postsCount: 4 }
      return [...prev, { platform, contentType, ...defaults }]
    })
  }

  function isSelected(platform: string, contentType: string) {
    return platforms.some(p => p.platform === platform && p.contentType === contentType)
  }

  function updatePostsCount(platform: string, contentType: string, value: number) {
    setPlatforms(prev => prev.map(p => {
      if (p.platform !== platform || p.contentType !== contentType) return p
      const postsCount = Math.max(1, Math.min(30, value))
      if (!p.targetKeywords) return { ...p, postsCount }
      // Resize the keyword list to match, preserving existing entries by index.
      const targetKeywords = Array.from({ length: postsCount }, (_, i) => p.targetKeywords?.[i] ?? '')
      return { ...p, postsCount, targetKeywords }
    }))
  }

  function updateFinalUrl(platform: string, contentType: string, value: string) {
    setPlatforms(prev => prev.map(p =>
      p.platform === platform && p.contentType === contentType
        ? { ...p, finalUrl: value }
        : p
    ))
  }

  function updateTargetKeywordAt(platform: string, contentType: string, index: number, value: string) {
    setPlatforms(prev => prev.map(p => {
      if (p.platform !== platform || p.contentType !== contentType) return p
      const targetKeywords = [...(p.targetKeywords ?? [])]
      targetKeywords[index] = value
      return { ...p, targetKeywords }
    }))
  }

  // Splits a pasted block of text (one keyword per line) across the post's
  // keyword slots in order — lets someone fill 30 keywords in one paste
  // instead of clicking into 30 separate fields.
  function pasteTargetKeywords(platform: string, contentType: string, text: string) {
    const lines = text.split('\n').map(l => l.trim())
    setPlatforms(prev => prev.map(p => {
      if (p.platform !== platform || p.contentType !== contentType) return p
      const targetKeywords = Array.from({ length: p.postsCount }, (_, i) => lines[i] ?? p.targetKeywords?.[i] ?? '')
      return { ...p, targetKeywords }
    }))
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
        <p className="text-sm text-gray-500 mb-4">Select platform and content type combinations, then set how many posts per month for each.</p>

        <div className="space-y-4">
          {PLATFORMS.map(({ value, label, supportsVideo, supportsCarousel, adOnly, websiteOnly, videoOnly }) => (
            <div key={value}>
              <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
              <div className="flex gap-2">
                {(websiteOnly ? (['BLOG_POST', 'LANDING_PAGE'] as const) : adOnly ? (['AD_COPY'] as const) : (['IMAGE', 'VIDEO', 'CAROUSEL'] as const)).map(type => {
                  if (type === 'VIDEO' && !supportsVideo) return null
                  if (type === 'CAROUSEL' && !supportsCarousel) return null
                  if (type === 'IMAGE' && videoOnly) return null
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
                      {type === 'AD_COPY' ? 'Ad Copy' : type === 'BLOG_POST' ? 'Blog Post' : type === 'LANDING_PAGE' ? 'Landing Page' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {platforms.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Selected ({platforms.length}) — set posts per month:</p>
            <div className="space-y-2">
              {platforms.map((p, i) => {
                const isAdCopy = p.contentType === 'AD_COPY'
                const isBlogPost = p.contentType === 'BLOG_POST'
                const isLandingPage = p.contentType === 'LANDING_PAGE'
                const needsTargetKeyword = isBlogPost || isLandingPage
                const contentTypeLabel = isAdCopy ? 'Ad Copy' : isBlogPost ? 'Blog Post' : isLandingPage ? 'Landing Page' : p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()
                return (
                  <div key={i} className="bg-blue-50 rounded-lg px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800 font-medium">
                        {p.platform} · {contentTypeLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600">{isAdCopy ? 'Ad variants:' : 'Posts/month:'}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updatePostsCount(p.platform, p.contentType, p.postsCount - 1)}
                            className="w-6 h-6 rounded border border-blue-200 bg-white text-blue-700 text-sm font-bold flex items-center justify-center hover:bg-blue-50 disabled:opacity-40"
                            disabled={p.postsCount <= 1}
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={p.postsCount}
                            onChange={e => updatePostsCount(p.platform, p.contentType, parseInt(e.target.value) || 1)}
                            className="w-10 px-1 py-0.5 text-sm border border-blue-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => updatePostsCount(p.platform, p.contentType, p.postsCount + 1)}
                            className="w-6 h-6 rounded border border-blue-200 bg-white text-blue-700 text-sm font-bold flex items-center justify-center hover:bg-blue-50 disabled:opacity-40"
                            disabled={p.postsCount >= 30}
                          >+</button>
                        </div>
                      </div>
                    </div>
                    {isAdCopy && (
                      <input
                        type="url"
                        value={p.finalUrl ?? ''}
                        onChange={e => updateFinalUrl(p.platform, p.contentType, e.target.value)}
                        placeholder="Landing Page URL — e.g. https://niranjanenterprises.com/services/seo"
                        className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-blue-300"
                      />
                    )}
                    {needsTargetKeyword && p.postsCount === 1 && (
                      <input
                        type="text"
                        value={p.targetKeywords?.[0] ?? ''}
                        onChange={e => updateTargetKeywordAt(p.platform, p.contentType, 0, e.target.value)}
                        placeholder="Target keyword — e.g. affordable website design in Pune"
                        className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-blue-300"
                      />
                    )}
                    {needsTargetKeyword && p.postsCount > 1 && (() => {
                      const draftKey = `${p.platform}::${p.contentType}`
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-blue-600">
                            Each of the {p.postsCount} {isBlogPost ? 'blog posts' : 'landing pages'} can target its own keyword — leave any blank to let AI choose one.
                          </p>
                          <div className="flex gap-1.5">
                            <textarea
                              rows={2}
                              value={keywordPasteDrafts[draftKey] ?? ''}
                              onChange={e => setKeywordPasteDrafts(d => ({ ...d, [draftKey]: e.target.value }))}
                              placeholder={`Paste up to ${p.postsCount} keywords here, one per line, then click "Fill in"`}
                              className="flex-1 px-2.5 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-blue-300 resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => pasteTargetKeywords(p.platform, p.contentType, keywordPasteDrafts[draftKey] ?? '')}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 rounded bg-white hover:bg-blue-50 self-start"
                            >
                              Fill in
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {Array.from({ length: p.postsCount }, (_, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="w-5 shrink-0 text-right text-xs text-blue-400">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={p.targetKeywords?.[idx] ?? ''}
                                  onChange={e => updateTargetKeywordAt(p.platform, p.contentType, idx, e.target.value)}
                                  placeholder={`Keyword for post ${idx + 1} — or leave blank`}
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-blue-300"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Total posts this month: <span className="font-semibold text-gray-600">{platforms.reduce((s, p) => s + p.postsCount, 0)}</span>
            </p>
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
