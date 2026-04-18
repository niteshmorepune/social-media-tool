import BriefForm from '@/components/BriefForm'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function NewBriefPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, primaryColor: true }
  })

  if (clients.length === 0) redirect('/clients/new')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Brief</h1>
        <p className="text-sm text-gray-500 mt-0.5">Define the campaign and select platforms.</p>
      </div>
      <BriefForm clients={clients} />
    </div>
  )
}
