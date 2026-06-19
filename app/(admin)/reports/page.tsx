import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ReportsPage() {
  // Single query — aggregate in JS rather than multiple groupBy calls
  const allContent = await prisma.content.findMany({
    select: {
      id:        true,
      status:    true,
      platform:  true,
      createdAt: true,
      updatedAt: true,
      brief: {
        select: {
          title: true,
          client: { select: { id: true, name: true } }
        }
      }
    }
  })

  const now = Date.now()
  const total = allContent.length

  // ── Overall counts ────────────────────────────────────────────────────────
  const approved  = allContent.filter(c => c.status === 'APPROVED').length
  const pending   = allContent.filter(c => c.status === 'PENDING').length
  const revision  = allContent.filter(c => c.status === 'REVISION_REQUESTED').length
  const rejected  = allContent.filter(c => c.status === 'REJECTED').length
  const awaiting  = pending + revision

  // Average days from creation to approval (approved items only)
  const approvedItems = allContent.filter(c => c.status === 'APPROVED')
  const avgDaysToApproval = approvedItems.length > 0
    ? (approvedItems.reduce((sum, c) => sum + (c.updatedAt.getTime() - c.createdAt.getTime()), 0) /
       approvedItems.length / 86400000)
    : null

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

  // ── Per-client breakdown ──────────────────────────────────────────────────
  const clientMap = new Map<string, {
    name: string
    total: number; approved: number; pending: number; revision: number; rejected: number
  }>()
  for (const c of allContent) {
    const { id, name } = c.brief.client
    if (!clientMap.has(id)) clientMap.set(id, { name, total: 0, approved: 0, pending: 0, revision: 0, rejected: 0 })
    const entry = clientMap.get(id)!
    entry.total++
    if (c.status === 'APPROVED')            entry.approved++
    else if (c.status === 'PENDING')        entry.pending++
    else if (c.status === 'REVISION_REQUESTED') entry.revision++
    else if (c.status === 'REJECTED')       entry.rejected++
  }
  const clientRows = [...clientMap.values()].sort((a, b) => b.total - a.total)

  // ── Per-platform breakdown ────────────────────────────────────────────────
  const platformMap = new Map<string, {
    total: number; approved: number; pending: number; revision: number; rejected: number
  }>()
  for (const c of allContent) {
    if (!platformMap.has(c.platform)) {
      platformMap.set(c.platform, { total: 0, approved: 0, pending: 0, revision: 0, rejected: 0 })
    }
    const entry = platformMap.get(c.platform)!
    entry.total++
    if (c.status === 'APPROVED')                entry.approved++
    else if (c.status === 'PENDING')            entry.pending++
    else if (c.status === 'REVISION_REQUESTED') entry.revision++
    else if (c.status === 'REJECTED')           entry.rejected++
  }
  const platformRows = [...platformMap.entries()]
    .map(([platform, counts]) => ({ platform, ...counts }))
    .sort((a, b) => b.total - a.total)

  // ── Oldest awaiting action ────────────────────────────────────────────────
  const awaitingItems = allContent
    .filter(c => c.status === 'PENDING' || c.status === 'REVISION_REQUESTED')
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 10)
    .map(c => ({
      id:      c.id,
      client:  c.brief.client.name,
      brief:   c.brief.title,
      platform: c.platform,
      status:  c.status,
      daysWaiting: Math.floor((now - c.updatedAt.getTime()) / 86400000),
    }))

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approval Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pipeline health across all clients and platforms.
        </p>
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No content generated yet.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Summary stat cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Content" value={total} sub="items" />
            <StatCard
              label="Approval Rate"
              value={`${approvalRate}%`}
              sub={`${approved} of ${total} approved`}
              color={approvalRate >= 70 ? 'green' : approvalRate >= 40 ? 'amber' : 'red'}
            />
            <StatCard
              label="Awaiting Action"
              value={awaiting}
              sub={`${pending} pending · ${revision} revision`}
              color={awaiting > 0 ? 'amber' : 'green'}
            />
            <StatCard
              label="Avg. Days to Approve"
              value={avgDaysToApproval !== null ? avgDaysToApproval.toFixed(1) : '—'}
              sub={avgDaysToApproval !== null ? 'from generation to approval' : 'no approved items yet'}
            />
          </div>

          {/* ── Status overview bar ────────────────────────────────────── */}
          {total > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Overall Status</p>
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                {approved > 0  && <div className="bg-green-400"  style={{ width: `${(approved / total) * 100}%` }} title={`Approved: ${approved}`} />}
                {pending  > 0  && <div className="bg-yellow-400" style={{ width: `${(pending  / total) * 100}%` }} title={`Pending: ${pending}`} />}
                {revision > 0  && <div className="bg-orange-400" style={{ width: `${(revision / total) * 100}%` }} title={`Revision: ${revision}`} />}
                {rejected > 0  && <div className="bg-red-400"    style={{ width: `${(rejected / total) * 100}%` }} title={`Rejected: ${rejected}`} />}
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  { label: 'Approved',  count: approved, color: 'bg-green-400' },
                  { label: 'Pending',   count: pending,  color: 'bg-yellow-400' },
                  { label: 'Revision',  count: revision, color: 'bg-orange-400' },
                  { label: 'Rejected',  count: rejected, color: 'bg-red-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                    <span className="text-xs text-gray-600">{label} <span className="font-semibold text-gray-900">{count}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Per-client table ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900">By Client</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Approved</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-yellow-600 uppercase tracking-wide">Pending</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Revision</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Rejected</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientRows.map(row => {
                    const rate = Math.round((row.approved / row.total) * 100)
                    return (
                      <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.total}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{row.approved}</td>
                        <td className="px-4 py-3 text-right text-yellow-600">{row.pending}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{row.revision}</td>
                        <td className="px-4 py-3 text-right text-red-500">{row.rejected}</td>
                        <td className="px-5 py-3 text-right">
                          <RateBadge rate={rate} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Per-platform breakdown ──────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-semibold text-gray-900 mb-4">By Platform</p>
            <div className="space-y-3">
              {platformRows.map(row => {
                const rate = Math.round((row.approved / row.total) * 100)
                return (
                  <div key={row.platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{row.platform}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{row.total} posts</span>
                        <RateBadge rate={rate} />
                      </div>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-gray-100">
                      {row.approved > 0  && <div className="bg-green-400"  style={{ width: `${(row.approved  / row.total) * 100}%` }} />}
                      {row.pending  > 0  && <div className="bg-yellow-400" style={{ width: `${(row.pending   / row.total) * 100}%` }} />}
                      {row.revision > 0  && <div className="bg-orange-400" style={{ width: `${(row.revision  / row.total) * 100}%` }} />}
                      {row.rejected > 0  && <div className="bg-red-400"    style={{ width: `${(row.rejected  / row.total) * 100}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Oldest awaiting action ──────────────────────────────────── */}
          {awaitingItems.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Oldest Awaiting Action</p>
                  <p className="text-xs text-gray-400 mt-0.5">Content waiting longest for approval or revision review</p>
                </div>
                <Link
                  href="/approvals?status=PENDING"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {awaitingItems.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.client}</p>
                      <p className="text-xs text-gray-400 truncate">{item.brief} · {item.platform}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'REVISION_REQUESTED'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {item.status === 'REVISION_REQUESTED' ? 'Revision' : 'Pending'}
                      </span>
                      <span className={`text-xs font-semibold tabular-nums ${
                        item.daysWaiting >= 7 ? 'text-red-500' :
                        item.daysWaiting >= 3 ? 'text-orange-500' :
                        'text-gray-500'
                      }`}>
                        {item.daysWaiting === 0 ? 'Today' : `${item.daysWaiting}d`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string
  value: string | number
  sub: string
  color?: 'green' | 'amber' | 'red'
}) {
  const valueColor =
    color === 'green' ? 'text-green-600' :
    color === 'amber' ? 'text-amber-600' :
    color === 'red'   ? 'text-red-500'   :
    'text-gray-900'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>
    </div>
  )
}

function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? 'bg-green-50 text-green-700' :
    rate >= 40 ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-600'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {rate}%
    </span>
  )
}
