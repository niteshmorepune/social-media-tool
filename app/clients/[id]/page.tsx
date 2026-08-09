import ClientForm from '@/components/ClientForm'
import ClientPortalLoginForm from '@/components/ClientPortalLoginForm'
import ClientPortalLoginsList from '@/components/ClientPortalLoginsList'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [client, teamMembers] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: { users: { where: { role: 'CLIENT' }, select: { id: true, name: true, email: true } } }
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'TEAM'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  if (!client) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/clients" className="hover:text-gray-700">Clients</Link>
          <span>/</span>
          <span className="text-gray-900">{client.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Client</h1>
      </div>

      <ClientForm client={client} teamMembers={teamMembers} />

      {/* Client portal logins */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Client Portal Access</h2>
        <ClientPortalLoginsList users={client.users} />
        <ClientPortalLoginForm clientId={id} />
      </div>
    </div>
  )
}
