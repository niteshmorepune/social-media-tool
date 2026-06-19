interface Slide {
  slideNumber: number
  text: string
  imagePrompt: string
  imageUrl?: string
}

interface Props {
  platform: string
  contentType: string
  clientName: string
  caption: string | null
  hashtags: string | null
  callToAction: string | null
  imageUrl: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  mediaStatus: string
  slides: Slide[] | null
}

interface MediaProps {
  contentType: string
  imageUrl: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  mediaStatus: string
  slides: Slide[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string | null, n: number) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n) + '…' : text
}

function toHandle(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.]/g, '').slice(0, 20)
}

function extractMediaProps(p: Props): MediaProps {
  return {
    contentType:  p.contentType,
    imageUrl:     p.imageUrl,
    videoUrl:     p.videoUrl,
    thumbnailUrl: p.thumbnailUrl,
    mediaStatus:  p.mediaStatus,
    slides:       p.slides,
  }
}

// Lean media renderer — no extra margins / rounding from MediaDisplay
function MockupMedia({ contentType, imageUrl, videoUrl, thumbnailUrl, mediaStatus, slides }: MediaProps) {
  if (contentType === 'IMAGE') {
    if (imageUrl) return <img src={imageUrl} alt="Post" className="w-full object-cover block" />
    if (mediaStatus === 'GENERATING') return (
      <div className="flex flex-col items-center justify-center h-52 bg-blue-50">
        <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-blue-500">Generating image…</p>
      </div>
    )
    return <div className="h-52 bg-gray-100 flex items-center justify-center"><p className="text-xs text-gray-400">No image yet</p></div>
  }

  if (contentType === 'VIDEO') {
    if (videoUrl) return <video src={videoUrl} controls className="w-full bg-black block" style={{ maxHeight: '320px' }} />
    if (thumbnailUrl) return (
      <div className="relative">
        <img src={thumbnailUrl} alt="Thumbnail" className="w-full object-cover block" style={{ maxHeight: '320px' }} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-14 h-14 bg-black/60 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      </div>
    )
    if (mediaStatus === 'GENERATING') return (
      <div className="flex flex-col items-center justify-center h-52 bg-blue-50">
        <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-blue-500">Generating video…</p>
      </div>
    )
    return <div className="h-52 bg-gray-900 flex items-center justify-center"><p className="text-xs text-gray-500">No video yet</p></div>
  }

  if (contentType === 'CAROUSEL') {
    const withImages = slides?.filter(s => s.imageUrl) ?? []
    if (withImages.length > 0) return (
      <div className="relative">
        <img src={withImages[0].imageUrl!} alt="Slide 1" className="w-full object-cover block aspect-square" />
        {withImages.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            1 / {withImages.length}
          </div>
        )}
      </div>
    )
    if (mediaStatus === 'GENERATING') return (
      <div className="flex flex-col items-center justify-center h-52 bg-blue-50">
        <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-blue-500">Generating slides…</p>
      </div>
    )
    return <div className="h-52 bg-gray-100" />
  }

  return <div className="h-52 bg-gray-100" />
}

// ── Platform mockups ──────────────────────────────────────────────────────────

function InstagramMockup(props: Props) {
  const handle = toHandle(props.clientName)
  const displayCaption  = truncate(props.caption, 125)
  const displayHashtags = truncate(props.hashtags, 80)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-sm mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-none">{handle}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sponsored</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </div>

      {/* Media */}
      <div className="w-full overflow-hidden bg-gray-100">
        <MockupMedia {...extractMediaProps(props)} />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </div>
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
      </div>

      {/* Caption */}
      {(displayCaption || displayHashtags) && (
        <div className="px-3 pb-3 space-y-1">
          {displayCaption && (
            <p className="text-xs text-gray-900 leading-relaxed">
              <span className="font-semibold">{handle}</span>{' '}{displayCaption}
            </p>
          )}
          {displayHashtags && <p className="text-xs text-blue-500">{displayHashtags}</p>}
        </div>
      )}
    </div>
  )
}

function FacebookMockup(props: Props) {
  const displayText = truncate(props.caption, 200)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-lg mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{props.clientName}</p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <span>Just now</span>
              <span>·</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
            </div>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 mt-1" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </div>

      {displayText && <p className="px-4 pb-3 text-sm text-gray-800 leading-relaxed">{displayText}</p>}

      <div className="overflow-hidden bg-gray-100">
        <MockupMedia {...extractMediaProps(props)} />
      </div>

      {/* Reaction counts */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><span className="text-[8px] text-white">👍</span></div>
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><span className="text-[8px] text-white">❤️</span></div>
          </div>
          <span className="text-xs text-gray-500 ml-1">24</span>
        </div>
        <span className="text-xs text-gray-500">3 comments</span>
      </div>

      {/* Action bar */}
      <div className="flex items-center divide-x divide-gray-100 px-2 py-1">
        {[{ icon: '👍', label: 'Like' }, { icon: '💬', label: 'Comment' }, { icon: '↗', label: 'Share' }].map(({ icon, label }) => (
          <button key={label} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function LinkedInMockup(props: Props) {
  const displayText     = truncate(props.caption, 200)
  const displayHashtags = truncate(props.hashtags, 80)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-lg mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center shrink-0 text-white font-bold text-lg">
            {props.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{props.clientName}</p>
            <p className="text-[11px] text-gray-500">Company · <span className="text-blue-600 font-medium">Follow</span></p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
              <span>1d</span>
              <span>·</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
            </div>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 mt-1" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </div>

      {(displayText || displayHashtags) && (
        <div className="px-4 pb-3">
          {displayText && <p className="text-sm text-gray-800 leading-relaxed">{displayText}</p>}
          {displayHashtags && <p className="text-sm text-blue-600 mt-1">{displayHashtags}</p>}
        </div>
      )}

      <div className="overflow-hidden bg-gray-100 border-t border-b border-gray-100">
        <MockupMedia {...extractMediaProps(props)} />
      </div>

      <div className="px-4 py-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>👍</span><span>❤️</span><span>💡</span>
          <span className="ml-1">48 reactions</span>
          <span className="ml-auto">7 comments</span>
        </div>
      </div>

      <div className="flex items-center divide-x divide-gray-100 px-2 py-1">
        {[{ icon: '👍', label: 'Like' }, { icon: '💬', label: 'Comment' }, { icon: '↩', label: 'Repost' }, { icon: '↗', label: 'Send' }].map(({ icon, label }) => (
          <button key={label} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TwitterMockup(props: Props) {
  const handle          = '@' + toHandle(props.clientName)
  const displayText     = truncate(props.caption, 280)
  const displayHashtags = truncate(props.hashtags, 100)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-sm mx-auto shadow-sm">
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-white font-bold">
          {props.clientName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold text-gray-900 truncate">{props.clientName}</p>
            <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1.01-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81-1.01 1.01-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91 1.01 1.01 2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81 1.01-1.01 1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12z" /></svg>
          </div>
          <p className="text-xs text-gray-500">{handle}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
      </div>

      <div className="px-4 pb-3">
        {displayText && <p className="text-sm text-gray-900 leading-relaxed">{displayText}</p>}
        {displayHashtags && <p className="text-sm text-blue-500 mt-1">{displayHashtags}</p>}
      </div>

      <div className="mx-4 mb-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
        <MockupMedia {...extractMediaProps(props)} />
      </div>

      <p className="px-4 text-xs text-gray-400 pb-2">9:41 AM · Jun 2025 · <span className="font-medium text-gray-600">1,234</span> Views</p>

      <div className="flex items-center justify-around px-4 py-2 border-t border-gray-100">
        {[
          { path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z', label: '12' },
          { path: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4', label: '48' },
          { path: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: '234' },
          { path: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', label: '' },
        ].map(({ path, label }, i) => (
          <button key={i} className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={path} /></svg>
            {label && <span className="text-xs">{label}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function TikTokMockup(props: Props) {
  const handle          = '@' + toHandle(props.clientName)
  const displayCaption  = truncate(props.caption, 100)
  const displayHashtags = props.hashtags?.split(/\s+/).slice(0, 4).join(' ') ?? ''

  return (
    <div className="bg-black rounded-xl overflow-hidden max-w-xs mx-auto shadow-xl relative">
      <div className="relative min-h-[420px] bg-gray-900 flex items-center justify-center">
        <MockupMedia {...extractMediaProps(props)} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
            {props.clientName.charAt(0).toUpperCase()}
          </div>
          {[{ icon: '♥', count: '12.4K' }, { icon: '💬', count: '847' }, { icon: '↗', count: '2.1K' }].map(({ icon, count }) => (
            <div key={count} className="flex flex-col items-center">
              <span className="text-2xl">{icon}</span>
              <span className="text-white text-[10px] font-medium mt-0.5">{count}</span>
            </div>
          ))}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-sm">♫</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-3 right-14 text-white">
          <p className="text-sm font-bold mb-1">{handle}</p>
          {displayCaption && <p className="text-xs leading-relaxed mb-1 opacity-90">{displayCaption}</p>}
          {displayHashtags && <p className="text-xs text-white/80">{displayHashtags}</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs">♫</span>
            <p className="text-[11px] opacity-75">Original Sound · {props.clientName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleBusinessMockup(props: Props) {
  const displayText = truncate(props.caption, 200)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-lg mx-auto shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{props.clientName}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            <span>Google Business Profile</span>
          </div>
        </div>
      </div>

      {displayText && <p className="px-4 py-3 text-sm text-gray-800 leading-relaxed">{displayText}</p>}

      <div className="overflow-hidden bg-gray-100">
        <MockupMedia {...extractMediaProps(props)} />
      </div>

      {props.callToAction && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button className="w-full py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
            {props.callToAction}
          </button>
        </div>
      )}
    </div>
  )
}

function DefaultMockup(props: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-lg mx-auto shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          {props.clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{props.clientName}</p>
          <p className="text-[11px] text-gray-400">{props.platform}</p>
        </div>
      </div>
      {props.caption && <p className="px-4 py-3 text-sm text-gray-800">{props.caption}</p>}
      <div className="overflow-hidden bg-gray-100"><MockupMedia {...extractMediaProps(props)} /></div>
      {props.hashtags && <p className="px-4 py-2 text-xs text-blue-500">{truncate(props.hashtags, 100)}</p>}
      {props.callToAction && <p className="px-4 pb-3 text-xs font-medium text-gray-700">{props.callToAction}</p>}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function PlatformMockup(props: Props) {
  switch (props.platform) {
    case 'Instagram':       return <InstagramMockup      {...props} />
    case 'Facebook':        return <FacebookMockup       {...props} />
    case 'LinkedIn':        return <LinkedInMockup       {...props} />
    case 'Twitter':         return <TwitterMockup        {...props} />
    case 'TikTok':          return <TikTokMockup         {...props} />
    case 'Google Business': return <GoogleBusinessMockup {...props} />
    default:                return <DefaultMockup        {...props} />
  }
}
