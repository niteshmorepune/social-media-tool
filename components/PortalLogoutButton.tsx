'use client'

import { signOut } from 'next-auth/react'

export default function PortalLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
    >
      Sign out
    </button>
  )
}
