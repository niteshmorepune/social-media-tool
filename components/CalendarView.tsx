'use client'

import { useRouter } from 'next/navigation'
import type { CalendarEvent } from '@/lib/events'

interface CalItem {
  id: string; day: number; platform: string; contentType: string
  status: string; caption: string; clientName: string; briefTitle: string
}
interface Client { id: string; name: string }

interface Props {
  year: number
  month: number
  items: CalItem[]
  clients: Client[]
  selectedClient: string
  events: Record<number, CalendarEvent[]>
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:         'bg-pink-100 text-pink-700 border-pink-200',
  Facebook:          'bg-blue-100 text-blue-700 border-blue-200',
  LinkedIn:          'bg-sky-100 text-sky-700 border-sky-200',
  Twitter:           'bg-slate-100 text-slate-700 border-slate-200',
  TikTok:            'bg-purple-100 text-purple-700 border-purple-200',
  'Google Business': 'bg-green-100 text-green-700 border-green-200',
}

const EVENT_COLORS: Record<string, string> = {
  national: 'bg-amber-50 text-amber-700',
  festival: 'bg-violet-50 text-violet-700',
  global:   'bg-teal-50 text-teal-700',
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function CalendarView({ year, month, items, clients, selectedClient, events }: Props) {
  const router = useRouter()

  function navigate(dir: number) {
    let m = month + dir, y = year
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    const q = new URLSearchParams({ year: String(y), month: String(m) })
    if (selectedClient) q.set('client', selectedClient)
    router.push(`/calendar?${q}`)
  }

  function filterClient(clientId: string) {
    const q = new URLSearchParams({ year: String(year), month: String(month) })
    if (clientId) q.set('client', clientId)
    router.push(`/calendar?${q}`)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow    = new Date(year, month - 1, 1).getDay()
  const today       = new Date()
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const grouped: Record<number, CalItem[]> = {}
  items.forEach(item => {
    if (!grouped[item.day]) grouped[item.day] = []
    grouped[item.day].push(item)
  })

  const totalItems = items.length
  const approved   = items.filter(i => i.status === 'APPROVED').length
  const pending    = items.filter(i => i.status === 'PENDING').length

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 w-44 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button onClick={() => navigate(1)}
            className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{totalItems} pieces</span>
          <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{approved} approved</span>
          <span className="text-xs text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full">{pending} pending</span>

          <select
            value={selectedClient}
            onChange={e => filterClient(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Leading empty cells */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e${i}`} className="min-h-24 border-b border-r border-gray-100 bg-gray-50/50" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day      = i + 1
            const dayItems = grouped[day] ?? []
            const dayEvents = events[day] ?? []
            const isToday  = isThisMonth && today.getDate() === day
            const col      = (firstDow + i) % 7
            const isLastCol = col === 6

            return (
              <div
                key={day}
                className={`min-h-24 p-1.5 border-b border-gray-100 ${!isLastCol ? 'border-r' : ''} ${
                  isToday ? 'bg-blue-50/40' : ''
                }`}
              >
                {/* Date number */}
                <p className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-500'
                }`}>
                  {day}
                </p>

                <div className="space-y-0.5">
                  {/* Event badges — shown first */}
                  {dayEvents.map(ev => (
                    <div
                      key={ev.name}
                      title={ev.name}
                      className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${EVENT_COLORS[ev.type]}`}
                    >
                      {ev.name}
                    </div>
                  ))}

                  {/* Content chips */}
                  {dayItems.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      title={`${item.clientName} · ${item.briefTitle}\n${item.caption}`}
                      className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-default ${
                        PLATFORM_COLORS[item.platform] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      <span className="font-medium">{item.platform.slice(0, 2)}</span>
                      {' '}
                      <span className="opacity-75">{item.clientName}</span>
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{dayItems.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
        {/* Platform legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
            <span key={platform} className={`text-xs px-2 py-0.5 rounded border ${color}`}>
              {platform}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200 hidden sm:block" />

        {/* Event type legend */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">National Holiday</span>
          <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700">Festival</span>
          <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700">Global / Marketing Day</span>
        </div>
      </div>
    </div>
  )
}
