import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ClientAvatar from '@/components/ClientAvatar'
import { formatMonth } from '@/lib/utils'

export default async function BriefsPage() {
  const briefs = await prisma.brief.findMany({
    orderBy: { scheduledMonth: 'desc' },
    include: {
      client: { select: { id: true, name: true, primaryColor: true } },
      createdBy: { select: { name: true } },
      platforms: true,
      _count: { select: { content: true } }
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Briefs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{briefs.length} brief{briefs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/briefs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Brief
        </Link>
      </div>

      {briefs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No briefs yet.</p>
          <Link href="/briefs/new" className="text-blue-600 text-sm font-medium mt-1 inline-block hover:underline">
            Create your first brief
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map(brief => (
            <div key={brief.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <ClientAvatar name={brief.client.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{brief.title}</p>
                    <p className="text-sm text-gray-500">{brief.client.name} · {formatMonth(brief.scheduledMonth)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {brief.platforms.map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {p.platform}
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">{p.contentType.charAt(0) + p.contentType.slice(1).toLowerCase()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{brief._count.content}</p>
                    <p className="text-xs text-gray-400">generated</p>
                  </div>
                  <Link
                    href={`/briefs/${brief.id}`}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg font-medium transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
