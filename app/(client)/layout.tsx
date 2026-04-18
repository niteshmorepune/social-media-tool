import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import PortalLogoutButton from '@/components/PortalLogoutButton'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'CLIENT') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Content Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <PortalLogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
