// Server-only media generation helpers
// Orchestrates: Replicate (image) → Cloudinary (storage) → RunwayML (video)

import replicate from './replicate-client'
import runway from './runway-client'
import { uploadFromUrl } from './cloudinary-client'

// ── Aspect ratios ─────────────────────────────────────────────────────────────

// Flux-1.1-pro supported ratios
function getFluxAspectRatio(platform: string, contentType: string): string {
  if (contentType === 'VIDEO') {
    // Thumbnail frame — match the video orientation
    return platform === 'TikTok' || platform === 'Instagram' ? '9:16' : '16:9'
  }
  switch (platform) {
    case 'Instagram':       return '4:5'   // portrait feed
    case 'TikTok':          return '9:16'
    case 'Twitter':         return '16:9'
    case 'LinkedIn':        return '4:3'
    case 'Facebook':        return '4:3'
    case 'Google Business': return '4:3'
    default:                return '1:1'
  }
}

// RunwayML Gen-3 Turbo supported ratios
function getRunwayRatio(platform: string): '768:1280' | '1280:768' {
  if (platform === 'TikTok' || platform === 'Instagram') return '768:1280'  // 9:16 portrait
  return '1280:768' // 16:9 landscape
}

// ── Image generation (Replicate Flux-1.1-pro → Cloudinary) ───────────────────

export async function generateImage(
  prompt:      string,
  platform:    string,
  contentType: string = 'IMAGE'
): Promise<string> {
  const aspectRatio = getFluxAspectRatio(platform, contentType)

  const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
    input: {
      prompt,
      aspect_ratio:      aspectRatio,
      output_format:     'webp',
      output_quality:    85,
      safety_tolerance:  2,
      prompt_upsampling: true,
    },
  })

  // Replicate SDK v1.x returns a FileOutput object (not a URL string array).
  // Normalise to a plain URL string regardless of what shape the SDK returns.
  let tempUrl: string
  if (typeof output === 'string') {
    tempUrl = output
  } else if (Array.isArray(output)) {
    const item = output[0]
    tempUrl = typeof item === 'string' ? item : (item as { url(): URL }).url().toString()
  } else {
    tempUrl = (output as { url(): URL }).url().toString()
  }

  return uploadFromUrl(tempUrl, 'images', 'image')
}

// ── Video generation pipeline (Replicate thumbnail → Cloudinary → RunwayML) ──

export async function generateThumbnailAndStartVideo(
  thumbnailPrompt: string,
  videoConcept:    string,
  hook:            string,
  platform:        string
): Promise<{ thumbnailUrl: string; mediaJobId: string }> {
  // Step 1: Generate thumbnail image with Replicate
  const thumbnailUrl = await generateImage(thumbnailPrompt, platform, 'VIDEO')

  // Step 2: Kick off RunwayML image-to-video with the Cloudinary thumbnail URL
  // gen3a_turbo has a hard 1000-character limit on promptText — truncate to be safe.
  const rawPrompt = [
    videoConcept,
    `Opening hook: ${hook}`,
    'Cinematic, professional social media video, smooth motion, high quality.',
  ].join(' ')
  const promptText = rawPrompt.length > 1000 ? rawPrompt.slice(0, 997) + '...' : rawPrompt

  const task = await runway.imageToVideo.create({
    model:       'gen3a_turbo',
    promptImage: thumbnailUrl,
    promptText,
    duration:    5,
    ratio:       getRunwayRatio(platform),
  })

  return { thumbnailUrl, mediaJobId: task.id }
}

// ── Carousel: generate one image per slide ────────────────────────────────────

export interface SlideInput {
  slideNumber: number
  text:        string
  imagePrompt: string
}

export interface SlideWithImage extends SlideInput {
  imageUrl: string
}

export async function generateCarouselImages(
  slides:   SlideInput[],
  platform: string
): Promise<SlideWithImage[]> {
  const results: SlideWithImage[] = []

  // Sequential to avoid Replicate rate limits
  for (const slide of slides) {
    const imageUrl = await generateImage(slide.imagePrompt, platform, 'IMAGE')
    results.push({ ...slide, imageUrl })
  }

  return results
}
