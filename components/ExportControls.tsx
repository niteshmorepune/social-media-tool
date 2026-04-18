'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string }
interface Month  { value: string; label: string }

export default function ExportControls({ clients, months }: { clients: Client[]; months: Month[] }) {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [month,    setMonth]    = useState(months[0]?.value ?? '')
  const [loading,  setLoading]  = useState(false)

  function buildUrl(format: string) {
    const q = new URLSearchParams({ format })
    if (clientId) q.set('clientId', clientId)
    if (month)    q.set('month', month)
    return `/api/export?${q}`
  }

  async function downloadCsv() {
    setLoading(true)
    const res = await fetch(buildUrl('csv'))
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `content-${month || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(false)
  }

  function openPrintReport() {
    const q = new URLSearchParams()
    if (clientId) q.set('clientId', clientId)
    if (month)    q.set('month', month)
    router.push(`/export/print?${q}`)
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Filter Content</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month} onChange={e => setMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All months</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Export options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CSV */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">CSV Export</h3>
          <p className="text-sm text-gray-500 mb-4">
            All content fields in a spreadsheet. Import into Buffer, Hootsuite, or any scheduling tool.
          </p>
          <button
            onClick={downloadCsv}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Downloading...' : 'Download CSV'}
          </button>
        </div>

        {/* PDF Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">PDF Report</h3>
          <p className="text-sm text-gray-500 mb-4">
            Client-ready report. Preview it, then download directly as a PDF file.
          </p>
          <button
            onClick={openPrintReport}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Preview & Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
