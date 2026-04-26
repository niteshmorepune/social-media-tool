export type EventType = 'national' | 'festival' | 'global'

export interface CalendarEvent {
  day: number
  name: string
  type: EventType
}

// Fixed-date events — repeat every year
const FIXED: Array<{ month: number; day: number; name: string; type: EventType }> = [
  { month: 1,  day: 1,  name: "New Year's Day",         type: 'global'   },
  { month: 1,  day: 26, name: 'Republic Day',            type: 'national' },
  { month: 2,  day: 14, name: "Valentine's Day",         type: 'global'   },
  { month: 3,  day: 8,  name: "International Women's Day", type: 'global' },
  { month: 4,  day: 7,  name: 'World Health Day',        type: 'global'   },
  { month: 4,  day: 14, name: 'Ambedkar Jayanti',        type: 'national' },
  { month: 4,  day: 22, name: 'Earth Day',               type: 'global'   },
  { month: 5,  day: 1,  name: 'Labour Day',              type: 'national' },
  { month: 6,  day: 5,  name: 'World Environment Day',   type: 'global'   },
  { month: 6,  day: 21, name: 'International Yoga Day',  type: 'global'   },
  { month: 8,  day: 15, name: 'Independence Day',        type: 'national' },
  { month: 8,  day: 19, name: 'World Photography Day',   type: 'global'   },
  { month: 9,  day: 5,  name: "Teachers' Day",           type: 'national' },
  { month: 10, day: 2,  name: 'Gandhi Jayanti',          type: 'national' },
  { month: 10, day: 10, name: 'World Mental Health Day', type: 'global'   },
  { month: 11, day: 14, name: "Children's Day",          type: 'national' },
  { month: 12, day: 25, name: 'Christmas',               type: 'festival' },
  { month: 12, day: 31, name: "New Year's Eve",          type: 'global'   },
]

// Variable-date events — year-specific (Indian festivals + shopping days)
const VARIABLE: Array<{ year: number; month: number; day: number; name: string; type: EventType }> = [
  // ── 2025 ──────────────────────────────────────────────────
  { year: 2025, month: 1,  day: 14, name: 'Makar Sankranti',  type: 'festival' },
  { year: 2025, month: 2,  day: 26, name: 'Maha Shivratri',   type: 'festival' },
  { year: 2025, month: 3,  day: 14, name: 'Holi',             type: 'festival' },
  { year: 2025, month: 4,  day: 1,  name: 'Eid ul-Fitr',      type: 'festival' },
  { year: 2025, month: 4,  day: 6,  name: 'Ram Navami',       type: 'festival' },
  { year: 2025, month: 6,  day: 7,  name: 'Eid ul-Adha',      type: 'festival' },
  { year: 2025, month: 8,  day: 9,  name: 'Raksha Bandhan',   type: 'festival' },
  { year: 2025, month: 8,  day: 16, name: 'Janmashtami',      type: 'festival' },
  { year: 2025, month: 8,  day: 27, name: 'Ganesh Chaturthi', type: 'festival' },
  { year: 2025, month: 9,  day: 29, name: 'Navratri',         type: 'festival' },
  { year: 2025, month: 10, day: 2,  name: 'Dussehra',         type: 'festival' },
  { year: 2025, month: 10, day: 18, name: 'Dhanteras',        type: 'festival' },
  { year: 2025, month: 10, day: 20, name: 'Diwali',           type: 'festival' },
  { year: 2025, month: 10, day: 22, name: 'Bhai Dooj',        type: 'festival' },
  { year: 2025, month: 11, day: 5,  name: 'Guru Nanak Jayanti', type: 'festival' },
  { year: 2025, month: 11, day: 28, name: 'Black Friday',     type: 'global'   },
  { year: 2025, month: 12, day: 1,  name: 'Cyber Monday',     type: 'global'   },

  // ── 2026 ──────────────────────────────────────────────────
  { year: 2026, month: 1,  day: 14, name: 'Makar Sankranti',  type: 'festival' },
  { year: 2026, month: 2,  day: 15, name: 'Maha Shivratri',   type: 'festival' },
  { year: 2026, month: 3,  day: 3,  name: 'Holi',             type: 'festival' },
  { year: 2026, month: 3,  day: 20, name: 'Eid ul-Fitr',      type: 'festival' },
  { year: 2026, month: 3,  day: 27, name: 'Ram Navami',       type: 'festival' },
  { year: 2026, month: 5,  day: 27, name: 'Eid ul-Adha',      type: 'festival' },
  { year: 2026, month: 8,  day: 14, name: 'Janmashtami',      type: 'festival' },
  { year: 2026, month: 8,  day: 25, name: 'Ganesh Chaturthi', type: 'festival' },
  { year: 2026, month: 8,  day: 28, name: 'Raksha Bandhan',   type: 'festival' },
  { year: 2026, month: 10, day: 19, name: 'Navratri',         type: 'festival' },
  { year: 2026, month: 10, day: 28, name: 'Dussehra',         type: 'festival' },
  { year: 2026, month: 11, day: 6,  name: 'Dhanteras',        type: 'festival' },
  { year: 2026, month: 11, day: 8,  name: 'Diwali',           type: 'festival' },
  { year: 2026, month: 11, day: 10, name: 'Bhai Dooj',        type: 'festival' },
  { year: 2026, month: 11, day: 24, name: 'Guru Nanak Jayanti', type: 'festival' },
  { year: 2026, month: 11, day: 27, name: 'Black Friday',     type: 'global'   },
  { year: 2026, month: 11, day: 30, name: 'Cyber Monday',     type: 'global'   },
]

export function getEventsForMonth(year: number, month: number): Record<number, CalendarEvent[]> {
  const result: Record<number, CalendarEvent[]> = {}

  function add(day: number, event: CalendarEvent) {
    if (!result[day]) result[day] = []
    result[day].push(event)
  }

  FIXED.filter(e => e.month === month).forEach(e =>
    add(e.day, { day: e.day, name: e.name, type: e.type })
  )

  VARIABLE.filter(e => e.year === year && e.month === month).forEach(e =>
    add(e.day, { day: e.day, name: e.name, type: e.type })
  )

  return result
}
