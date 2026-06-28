import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getStatusColor, getStatusLabel } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [
    clientCount,
    pendingCount,
    approvedCount,
    revisionCount,
    thisMonthGenerated,
    totalContent,
    recentContent,
    clientsWithPending
  ] = await Promise.all([
    prisma.client.count(),
    prisma.content.count({ where: { status: 'PENDING' } }),
    prisma.content.count({ where: { status: 'APPROVED' } }),
    prisma.content.count({ where: { status: 'REVISION_REQUESTED' } }),
    prisma.content.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.content.count(),
    prisma.content.findMany({
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: { brief: { include: { client: { select: { name: true } } } } }
    }),
    prisma.client.findMany({
      where: { briefs: { some: { content: { some: { status: 'PENDING' } } } } },
      select: { id: true, name: true, _count: { select: { briefs: true } } },
      take: 5
    })
  ])

  const stats = [
    {
      label: 'Total Clients',
      value: clientCount,
      icon: '👥',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      href: '/clients'
    },
    {
      label: 'Pending Review',
      value: pendingCount,
      icon: '⏳',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      href: '/approvals?status=PENDING'
    },
    {
      label: 'Revision Requested',
      value: revisionCount,
      icon: '✏️',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      href: '/approvals?status=REVISION_REQUESTED'
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: '✅',
      bg: 'bg-green-50',
      text: 'text-green-700',
      href: '/approvals?status=APPROVED'
    },
    {
      label: 'Generated This Month',
      value: thisMonthGenerated,
      icon: '⚡',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      href: '/generate'
    },
    {
      label: 'Total Content',
      value: totalContent,
      icon: '📋',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      href: '/approvals'
    },
  ]

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon, bg, text, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{label}</span>
              <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-base`}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${text}`}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/approvals" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            {recentContent.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No content yet. <Link href="/clients/new" className="text-blue-600 hover:underline">Add your first client</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentContent.map(c => (
                  <li key={c.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.brief.client.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.platform} · {c.contentType.charAt(0) + c.contentType.slice(1).toLowerCase()} · {c.brief.title}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Add Client',      href: '/clients/new',  color: 'bg-blue-600 hover:bg-blue-700'   },
                { label: 'Create Brief',    href: '/briefs/new',   color: 'bg-purple-600 hover:bg-purple-700'},
                { label: 'Generate Content',href: '/generate',     color: 'bg-green-600 hover:bg-green-700' },
                { label: 'Export Report',   href: '/export',       color: 'bg-gray-800 hover:bg-gray-900'   },
              ].map(({ label, href, color }) => (
                <Link key={label} href={href}
                  className={`block w-full text-center py-2 text-sm font-medium text-white rounded-lg transition-colors ${color}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Clients with pending content */}
          {clientsWithPending.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Needs Attention</h2>
              <ul className="space-y-2">
                {clientsWithPending.map(c => (
                  <li key={c.id}>
                    <Link href={`/approvals`}
                      className="flex items-center justify-between py-1.5 text-sm text-gray-700 hover:text-blue-600 group">
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                        pending
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
