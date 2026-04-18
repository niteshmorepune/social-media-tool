'use client'

import { useState } from 'react'

interface ContentItem {
  id: string; platform: string; contentType: string; status: string
  caption: string | null; copy: string | null; hook: string | null
  script: string | null; onScreenText: string | null; hashtags: string | null
  callToAction: string | null; imagePrompt: string | null; videoConcept: string | null
  thumbnailPrompt: string | null; duration: string | null
  slides: { slideNumber: number; text: string; imagePrompt: string }[] | null
  briefTitle: string; clientName: string
}

interface Props {
  content: ContentItem[]
  clientName: string
  monthLabel: string
  appName: string
}

// Map common social media emojis to short ASCII equivalents so meaning is preserved
// in jsPDF (Helvetica is Latin-1 only and cannot render emoji glyphs).
// Emoji → Latin-1 symbol mapping (Helvetica covers 0x00–0xFF fully).
// » (U+00BB), « (U+00AB), × (U+00D7), · (U+00B7), ° (U+00B0), § (U+00A7)
const EMOJI_MAP: Record<string, string> = {
  // Status
  '✅': '+',   '❎': '×',  '❌': '×',  '⚠️': '(!)', '❗': '!',  '❕': '!',
  '❓': '?',   '❔': '?',

  // Search / info / ideas
  '🔍': '(?)', '🔎': '(?)', '💡': '(i)', '📌': '·',  '📍': '·',  '🗺️': '(map)',

  // Motion / goals / awards
  '🚀': '»',  '🎯': '»',  '🏆': '§',  '🥇': '(1)', '🥈': '(2)', '🥉': '(3)',

  // Stars / sparkle / fire
  '⭐': '°',  '🌟': '°',  '✨': '°',  '💫': '·',  '🔥': '(!)', '💥': '(!)',

  // Directional / gestures
  '👉': '»',  '👈': '«',  '👆': '(^)', '👇': '(v)',
  '👋': '(!)', '🙌': '(!)', '👏': '(!)', '🤝': '(ok)', '💪': '(!)',
  '🤙': '(ok)', '👍': '(+)', '👎': '(-)',

  // Hearts
  '❤️': '<3', '🧡': '<3', '💛': '<3', '💚': '<3',
  '💙': '<3', '💜': '<3', '🖤': '<3', '🤍': '<3',

  // Faces / emotions
  '😊': ':)', '😀': ':D', '😃': ':D', '😄': ':D', '🤣': ':D',
  '😍': '<3', '🤩': ':D', '😎': 'B)', '😢': ':(',  '😭': ':(',
  '🎉': '(!)', '🎊': '(!)', '🎁': '(gift)', '🎨': '(art)',

  // Business / tech
  '📱': '(mob)', '💻': '(web)', '🖥️': '(web)', '⌨️': '(kbd)',
  '📊': '(=)', '📈': '(+)', '📉': '(-)', '📋': '(=)',
  '💰': '$',   '💵': '$',   '💴': '$',  '💶': '$',  '💷': '$',
  '🏦': '$',   '💳': '$',   '🪙': '$',

  // Communication / media
  '📣': '»',  '📢': '»',  '💬': '(msg)', '🗨️': '(msg)',
  '📧': '@',  '📩': '@',  '🔗': '»',    '🔖': '·',
  '🎬': '(vid)', '📸': '(img)', '🖼️': '(img)',

  // World / time / location
  '🌍': '(°)', '🌎': '(°)', '🌐': '(°)',
  '📅': '(d)', '📆': '(d)', '⏰': '(t)', '⌛': '(t)', '⏳': '(t)',
}

// jsPDF uses Latin-1 (Helvetica). Map emoji → ASCII, then replace other Unicode.
function sanitize(text: string): string {
  let out = text
  for (const [emoji, replacement] of Object.entries(EMOJI_MAP)) {
    out = out.split(emoji).join(replacement)
  }
  return out
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // curly single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')    // curly double quotes
    .replace(/[\u2013\u2014\u2015]/g, '-')           // en/em dash
    .replace(/\u2026/g, '...')                        // ellipsis
    .replace(/\u00A0/g, ' ')                          // non-breaking space
    .replace(/\u2022/g, '*')                          // bullet
    .replace(/\u00B7/g, '.')                          // middle dot
    .replace(/[^\x00-\xFF]/g, '')                     // strip any remaining non-Latin-1
    .replace(/ {2,}/g, ' ')                           // collapse extra spaces
    .trim()
}

export default function PrintReport({ content, clientName, monthLabel, appName }: Props) {
  const [downloading, setDownloading] = useState(false)

  async function downloadPdf() {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const pdf      = new jsPDF('p', 'mm', 'a4')
      const pageW    = 210
      const pageH    = 297
      const margin   = 20
      const maxW     = pageW - margin * 2
      let y          = margin

      // ── Helpers ──────────────────────────────────────────────────────────────

      function newPageIfNeeded(needed: number) {
        if (y + needed > pageH - margin) { pdf.addPage(); y = margin }
      }

      function label(text: string) {
        newPageIfNeeded(8)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(156, 163, 175)
        pdf.text(sanitize(text).toUpperCase(), margin, y)
        y += 5
      }

      function body(text: string, bold = false, indent = 0) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        pdf.setTextColor(31, 41, 55)
        const lines = pdf.splitTextToSize(sanitize(text), maxW - indent)
        newPageIfNeeded(lines.length * 5)
        pdf.text(lines, margin + indent, y)
        y += lines.length * 5 + 3
      }

      function field(lbl: string, value: string | null | undefined, bold = false) {
        if (!value) return
        newPageIfNeeded(14)
        label(lbl)
        body(value, bold)
      }

      function divider(color = [229, 231, 235] as [number, number, number], weight = 0.3) {
        newPageIfNeeded(6)
        pdf.setDrawColor(...color)
        pdf.setLineWidth(weight)
        pdf.line(margin, y, pageW - margin, y)
        y += 6
      }

      // ── Cover ─────────────────────────────────────────────────────────────────
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(150, 150, 150)
      pdf.text(sanitize(appName).toUpperCase(), margin, y)
      y += 9

      pdf.setFontSize(22)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 17, 17)
      pdf.text('Social Media Content Report', margin, y)
      y += 9

      pdf.setFontSize(13)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(75, 85, 99)
      pdf.text(sanitize(`${clientName} - ${monthLabel}`), margin, y)
      y += 7

      pdf.setFontSize(9)
      pdf.setTextColor(150, 150, 150)
      pdf.text(
        sanitize(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} - ${content.length} approved piece${content.length !== 1 ? 's' : ''}`),
        margin, y
      )
      y += 10

      divider([180, 180, 180], 0.5)
      y += 2

      // ── Content items ─────────────────────────────────────────────────────────
      content.forEach((item, idx) => {
        newPageIfNeeded(22)

        // Platform + type heading
        pdf.setFontSize(13)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(17, 17, 17)
        pdf.text(sanitize(`${item.platform} - ${item.contentType.charAt(0) + item.contentType.slice(1).toLowerCase()}`), margin, y)

        // "APPROVED" badge right-aligned on same line
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(21, 128, 61)
        pdf.text('APPROVED', pageW - margin, y, { align: 'right' })
        y += 6

        // Brief title
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(107, 114, 128)
        pdf.text(sanitize(item.briefTitle), margin, y)
        y += 8

        field('Caption', item.caption)
        field('Hook (First 3 Seconds)', item.hook, true)
        field('Copy', item.copy)
        field('Script', item.script)
        field('On-Screen Text', item.onScreenText)
        field('Hashtags', item.hashtags)
        field('Call to Action', item.callToAction, true)
        if (item.duration) field('Duration', item.duration)
        field('Image Direction', item.imagePrompt)
        field('Video Concept', item.videoConcept)

        if (item.slides && item.slides.length > 0) {
          newPageIfNeeded(12)
          label('Slides')
          item.slides.forEach(s => {
            newPageIfNeeded(14)
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(107, 114, 128)
            pdf.text(sanitize(`Slide ${s.slideNumber}`), margin + 3, y)
            y += 5
            body(s.text, false, 3)
          })
        }

        if (idx < content.length - 1) { y += 2; divider() }
      })

      // ── Footer ────────────────────────────────────────────────────────────────
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(156, 163, 175)
      pdf.text(
        sanitize(`${appName} - Confidential - ${new Date().getFullYear()}`),
        pageW / 2, pageH - 10, { align: 'center' }
      )

      const safeName = `${clientName}-${monthLabel}`.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      pdf.save(`report-${safeName}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const grouped = content.reduce<Record<string, ContentItem[]>>((acc, c) => {
    const key = c.clientName
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
        }
        body { font-family: Georgia, serif; color: #111; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-gray-900 text-white px-6 py-3 flex items-center justify-between z-50 text-sm">
        <span>Report preview — <strong>{clientName}</strong> · {monthLabel}</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-3 py-1.5 border border-gray-600 rounded hover:bg-gray-800"
          >
            ← Back
          </button>
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded font-medium flex items-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report content — captured by html2canvas */}
      <div id="report-content" className="max-w-4xl mx-auto px-8 pt-16 pb-8">
        {/* Cover */}
        <div className="mb-12 pb-8 border-b-2 border-gray-200">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">{appName}</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Social Media Content Report</h1>
          <p className="text-xl text-gray-600">{clientName} · {monthLabel}</p>
          <p className="text-sm text-gray-400 mt-4">
            Generated {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} ·{' '}
            {content.length} approved piece{content.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content per client */}
        {Object.entries(grouped).map(([client, items], gi) => (
          <div key={client} className={gi > 0 ? 'page-break' : ''}>
            {Object.keys(grouped).length > 1 && (
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{client}</h2>
            )}
            {items.map(item => (
              <div key={item.id} className="mb-10 pb-10 border-b border-gray-200 last:border-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.platform} — {item.contentType.charAt(0) + item.contentType.slice(1).toLowerCase()}
                    </h3>
                    <p className="text-sm text-gray-500">{item.briefTitle}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                    Approved
                  </span>
                </div>

                {item.caption     && <PrintField label="Caption"           value={item.caption} />}
                {item.hook        && <PrintField label="Hook (First 3 Seconds)" value={item.hook} bold />}
                {item.copy        && <PrintField label="Copy"              value={item.copy} />}
                {item.script      && <PrintField label="Script"            value={item.script} />}
                {item.onScreenText && <PrintField label="On-Screen Text"   value={item.onScreenText} />}
                {item.hashtags    && <PrintField label="Hashtags"          value={item.hashtags} />}
                {item.callToAction && <PrintField label="Call to Action"   value={item.callToAction} bold />}
                {item.duration && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Duration:</strong> {item.duration}
                  </p>
                )}
                {item.imagePrompt && (
                  <div className="mt-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Image Direction</p>
                    <p className="text-sm text-gray-600 italic">{item.imagePrompt}</p>
                  </div>
                )}
                {item.videoConcept && (
                  <div className="mt-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Video Concept</p>
                    <p className="text-sm text-gray-600 italic">{item.videoConcept}</p>
                  </div>
                )}
                {item.slides && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Slides</p>
                    <div className="space-y-2">
                      {item.slides.map(s => (
                        <div key={s.slideNumber} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 mb-1">Slide {s.slideNumber}</p>
                          <p className="text-sm text-gray-800">{s.text}</p>
                          {s.imagePrompt && <p className="text-xs text-gray-400 italic mt-1">{s.imagePrompt}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          {appName} · Confidential · {new Date().getFullYear()}
        </div>
      </div>
    </>
  )
}

function PrintField({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-gray-800 whitespace-pre-line leading-relaxed ${bold ? 'font-semibold' : ''}`}>
        {value}
      </p>
    </div>
  )
}
