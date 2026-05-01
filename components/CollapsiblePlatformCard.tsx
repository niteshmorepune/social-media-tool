'use client'

import { useState } from 'react'

interface Props {
  header: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function CollapsiblePlatformCard({ header, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{header}</div>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open && children}
    </div>
  )
}
