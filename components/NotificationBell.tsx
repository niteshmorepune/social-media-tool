'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function typeIcon(type: string) {
  if (type === 'APPROVED')           return '✅'
  if (type === 'REVISION_REQUESTED') return '✏️'
  if (type === 'REJECTED')           return '❌'
  return '🔔'
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [unread, setUnread]       = useState(0)
  const [items, setItems]         = useState<NotificationItem[]>([])

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setUnread(d.unreadCount ?? 0)
        setItems(d.notifications ?? [])
      })
      .catch(() => {})
  }, [])

  // Close on outside click — target both button and fixed panel via data attr
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-notif-panel]')) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread > 0) {
      fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
      setUnread(0)
      setItems(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  return (
    <>
      <button
        data-notif-panel
        onClick={toggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <div className="relative w-4 h-4 shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        Notifications
        {unread > 0 && (
          <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        // Fixed panel opens to the right of the sidebar (sidebar = w-64 = 256px)
        <div
          data-notif-panel
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ left: '272px', bottom: '5rem', width: '320px', maxHeight: '480px' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(n => (
                  <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-base mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                          {n.link && (
                            <Link
                              href={n.link}
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => setOpen(false)}
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
