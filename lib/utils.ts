// Platform display names and metadata
export const PLATFORMS = [
  { value: 'Instagram',       label: 'Instagram',         supportsVideo: true,  supportsCarousel: true  },
  { value: 'Facebook',        label: 'Facebook',          supportsVideo: true,  supportsCarousel: true  },
  { value: 'LinkedIn',        label: 'LinkedIn',          supportsVideo: true,  supportsCarousel: true  },
  { value: 'Twitter',         label: 'Twitter / X',       supportsVideo: true,  supportsCarousel: false },
  { value: 'TikTok',          label: 'TikTok',            supportsVideo: true,  supportsCarousel: false },
  { value: 'Google Business', label: 'Google Business',   supportsVideo: true,  supportsCarousel: false },
] as const

export const CONTENT_GOALS = [
  'Brand Awareness',
  'Lead Generation',
  'Product Launch',
  'Promotion / Sale',
  'Community Engagement',
  'Educational / Tips',
  'Event Promotion',
  'Testimonial / Social Proof',
  'Holiday / Seasonal',
  'Behind the Scenes',
] as const

export const VIDEO_DURATIONS: Record<string, string[]> = {
  Instagram: ['15 seconds', '30 seconds', '60 seconds', '90 seconds'],
  Facebook:  ['30 seconds', '60 seconds', '2 minutes', '5 minutes'],
  LinkedIn:  ['30 seconds', '60 seconds', '3 minutes', '10 minutes'],
  Twitter:   ['30 seconds', '60 seconds', '2 minutes'],
  TikTok:    ['15 seconds', '30 seconds', '60 seconds'],
  'Google Business': ['30 seconds', '60 seconds'],
}

export const CAPTION_LIMITS: Record<string, number> = {
  Instagram:        2200,
  Facebook:         63206,
  LinkedIn:         3000,
  Twitter:          280,
  TikTok:           2200,
  'Google Business': 1500,
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function formatMonth(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long'
  })
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':           return 'bg-green-100 text-green-700'
    case 'REJECTED':           return 'bg-red-100 text-red-700'
    case 'REVISION_REQUESTED': return 'bg-yellow-100 text-yellow-700'
    default:                   return 'bg-gray-100 text-gray-700'
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'APPROVED':           return 'Approved'
    case 'REJECTED':           return 'Rejected'
    case 'REVISION_REQUESTED': return 'Revision Requested'
    default:                   return 'Pending'
  }
}
