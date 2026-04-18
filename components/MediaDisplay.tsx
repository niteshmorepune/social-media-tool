import VideoStatusPoller from './VideoStatusPoller'

interface Slide {
  slideNumber: number
  text:        string
  imagePrompt: string
  imageUrl?:   string
}

interface Props {
  contentId:    string
  contentType:  string
  imageUrl?:    string | null
  videoUrl?:    string | null
  thumbnailUrl?: string | null
  mediaStatus?: string | null
  slides?:      Slide[] | null
}

// Insert fl_attachment into a Cloudinary URL to force a browser download.
function downloadUrl(url: string, filename: string): string {
  return url.replace('/upload/', `/upload/fl_attachment:${filename}/`)
}

function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      {label}
    </a>
  )
}

export default function MediaDisplay({
  contentId,
  contentType,
  imageUrl,
  videoUrl,
  thumbnailUrl,
  mediaStatus,
  slides,
}: Props) {
  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (contentType === 'IMAGE') {
    if (imageUrl) {
      return (
        <div className="mb-4">
          <img
            src={imageUrl}
            alt="Generated content"
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: '500px' }}
          />
          <div className="mt-2 flex justify-end">
            <DownloadButton href={downloadUrl(imageUrl, `image-${contentId}`)} label="Download image" />
          </div>
        </div>
      )
    }
    if (mediaStatus === 'GENERATING') {
      return (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">Generating image...</p>
        </div>
      )
    }
    if (mediaStatus === 'FAILED') {
      return (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-600">Image generation failed. The image prompt is available below.</p>
        </div>
      )
    }
    return null
  }

  // ── VIDEO ──────────────────────────────────────────────────────────────────
  if (contentType === 'VIDEO') {
    if (videoUrl) {
      return (
        <div className="mb-4" suppressHydrationWarning>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: '480px' }}
            suppressHydrationWarning
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            {thumbnailUrl ? (
              <DownloadButton href={downloadUrl(thumbnailUrl, `thumbnail-${contentId}`)} label="Download thumbnail" />
            ) : <span />}
            <DownloadButton href={downloadUrl(videoUrl, `video-${contentId}`)} label="Download video" />
          </div>
        </div>
      )
    }
    if (mediaStatus === 'GENERATING') {
      return (
        <div className="mb-4">
          <VideoStatusPoller contentId={contentId} thumbnailUrl={thumbnailUrl ?? null} />
        </div>
      )
    }
    if (mediaStatus === 'FAILED') {
      return (
        <div className="mb-4">
          {thumbnailUrl && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Thumbnail</p>
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full rounded-xl object-cover" style={{ maxHeight: '300px' }} />
              <div className="mt-2 flex justify-end">
                <DownloadButton href={downloadUrl(thumbnailUrl, `thumbnail-${contentId}`)} label="Download thumbnail" />
              </div>
            </div>
          )}
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-sm text-red-600">Video generation failed. Script and concept are available below.</p>
          </div>
        </div>
      )
    }
    return null
  }

  // ── CAROUSEL ───────────────────────────────────────────────────────────────
  if (contentType === 'CAROUSEL') {
    const slidesWithImages = slides?.filter(s => s.imageUrl)
    if (slidesWithImages && slidesWithImages.length > 0) {
      return (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Generated Slides</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {slidesWithImages.map(slide => (
              <div key={slide.slideNumber} className="relative rounded-lg overflow-hidden bg-gray-100 group">
                <img
                  src={slide.imageUrl!}
                  alt={`Slide ${slide.slideNumber}`}
                  className="w-full object-cover aspect-square"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 flex items-end justify-between">
                  <p className="text-white text-xs font-medium">Slide {slide.slideNumber}</p>
                  <a
                    href={downloadUrl(slide.imageUrl!, `slide-${slide.slideNumber}-${contentId}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white transition-colors"
                    title="Download slide"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (mediaStatus === 'GENERATING') {
      return (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">Generating carousel images...</p>
          <p className="text-xs text-blue-500 mt-1">One image per slide — may take a moment</p>
        </div>
      )
    }
    return null
  }

  return null
}
