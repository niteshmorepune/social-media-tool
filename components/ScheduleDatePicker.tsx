'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contentId: string
  scheduledDate: string | null  // ISO string or null
  scheduledMonth: string        // ISO string — used to constrain the date picker to the right month
}

export default function ScheduleDatePicker({ contentId, scheduledDate, scheduledMonth }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Derive the min/max from scheduledMonth so the picker stays within the brief's month
  const monthDate = new Date(scheduledMonth)
  const year  = monthDate.getFullYear()
  const month = monthDate.getMonth() // 0-indexed
  const min = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const max = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  // Convert stored UTC date to local YYYY-MM-DD for the input value
  const currentValue = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-CA') // en-CA gives YYYY-MM-DD
    : ''

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value // YYYY-MM-DD or ''
    setSaving(true)
    await fetch(`/api/content/${contentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: value || null })
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
        Post date
      </label>
      <input
        type="date"
        defaultValue={currentValue}
        min={min}
        max={max}
        onChange={handleChange}
        disabled={saving}
        className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
      />
      {saving && <span className="text-xs text-gray-400">Saving...</span>}
    </div>
  )
}
