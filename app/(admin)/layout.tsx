import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'CLIENT') redirect('/portal')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={session.user.role} userName={session.user.name ?? ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
