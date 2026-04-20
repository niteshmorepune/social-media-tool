// Server-only media generation helpers
// Orchestrates: Replicate (image) → Cloudinary (storage) → RunwayML (video)

import replicate from './replicate-client'
import getRunway from './runway-client'
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

// ── Replicate call with 429 retry/backoff ─────────────────────────────────────

async function runReplicate(
  model: Parameters<typeof replicate.run>[0],
  options: Parameters<typeof replicate.run>[1],
  maxRetries = 5
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await replicate.run(model, options)
    } catch (err: unknown) {
      const response = (err as Record<string, unknown>)?.response as Response | undefined
      if (response?.status === 429 && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after')
        // Honour retry-after but apply a minimum backoff that grows each attempt
        const waitMs = Math.max(
          retryAfter ? parseInt(retryAfter) * 1000 : 0,
          (attempt + 1) * 3000   // 3s, 6s, 9s, 12s, 15s
        )
        console.log(`Replicate 429 — waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      throw err
    }
  }
  throw new Error('Replicate: max retries exceeded')
}

// ── Image generation (Replicate Flux-1.1-pro → Cloudinary) ───────────────────

export async function generateImage(
  prompt:      string,
  platform:    string,
  contentType: string = 'IMAGE'
): Promise<string> {
  const aspectRatio = getFluxAspectRatio(platform, contentType)

  const output = await runReplicate('black-forest-labs/flux-1.1-pro', {
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

  const task = await getRunway().imageToVideo.create({
    model:       'gen3a_turbo',
    promptImage: thumbnailUrl,
    promptText,
    duration:    10,
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
