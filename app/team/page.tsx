import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamManagement from '@/components/TeamManagement'

export default async function TeamPage() {
  const session = await auth()
  if (session?.user.role !== 'ADMIN') redirect('/dashboard')

  const members = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TEAM'] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage admin and team member accounts.</p>
      </div>
      <TeamManagement members={members} currentUserId={session!.user.id} />
    </div>
  )
}
