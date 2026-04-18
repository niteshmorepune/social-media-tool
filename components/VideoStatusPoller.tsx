'use client'

import { useEffect, useState } from 'react'

interface Props {
  contentId:    string
  thumbnailUrl: string | null
  onReady?:     (videoUrl: string) => void
}

export default function VideoStatusPoller({ contentId, thumbnailUrl, onReady }: Props) {
  const [status, setStatus]   = useState<'GENERATING' | 'READY' | 'FAILED'>('GENERATING')
  const [progress, setProgress] = useState<number | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false

    async function poll() {
      while (!stopped) {
        try {
          const res  = await fetch(`/api/media/status/${contentId}`)
          const data = await res.json() as {
            mediaStatus: string
            videoUrl:    string | null
            progress:    number | null
          }

          if (data.mediaStatus === 'READY' && data.videoUrl) {
            setStatus('READY')
            setVideoUrl(data.videoUrl)
            onReady?.(data.videoUrl)
            return
          }

          if (data.mediaStatus === 'FAILED') {
            setStatus('FAILED')
            return
          }

          setProgress(data.progress)
        } catch {
          // network error — keep trying
        }

        // Poll every 6 seconds
        await new Promise(r => setTimeout(r, 6000))
      }
    }

    poll()
    return () => { stopped = true }
  }, [contentId, onReady])

  if (status === 'READY' && videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        className="w-full rounded-xl bg-black"
        style={{ maxHeight: '480px' }}
      />
    )
  }

  if (status === 'FAILED') {
    return (
      <div className="w-full rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Video generation failed.</p>
        <p className="text-xs text-red-400 mt-1">The text content and script are still available below.</p>
      </div>
    )
  }

  // GENERATING — show thumbnail + spinner overlay
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ minHeight: '200px' }}>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Generating video..."
          className="w-full object-cover opacity-40"
          style={{ maxHeight: '300px' }}
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">Generating video...</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {progress !== null ? `${Math.round(progress * 100)}% complete` : 'This usually takes 30–90 seconds'}
          </p>
        </div>
      </div>
    </div>
  )
}
