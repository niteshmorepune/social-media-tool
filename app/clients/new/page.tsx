import ClientForm from '@/components/ClientForm'
import { prisma } from '@/lib/prisma'

export default async function NewClientPage() {
  const teamMembers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TEAM'] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Client</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in the client&apos;s brand details.</p>
      </div>
      <ClientForm teamMembers={teamMembers} />
    </div>
  )
}
