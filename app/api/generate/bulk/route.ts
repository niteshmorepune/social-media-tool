import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import claude from '@/lib/claude'
import { NextResponse } from 'next/server'
import { CAPTION_LIMITS, VIDEO_DURATIONS } from '@/lib/utils'
import {
  generateImage,
  generateCarouselImages,
  generateThumbnailAndStartVideo,
  SlideInput,
} from '@/lib/media-generation'
import { metaAdCopyTool, googleAdCopyTool, AD_COPY_SYSTEM_PROMPT, buildAdCopyUserPrompt } from '@/lib/ad-copy'
import { validateMetaAdCopy, validateGoogleAdCopy, PolicyFlag } from '@/lib/ad-copy-policy'
import { buildBrandVoiceSection } from '@/lib/brand-voice'
import { blogPostTool, BLOG_SYSTEM_PROMPT, buildBlogUserPrompt } from '@/lib/blog-content'
import { landingPageTool, LANDING_PAGE_SYSTEM_PROMPT, buildLandingPageUserPrompt } from '@/lib/landing-page-content'
import { logAiUsage } from '@/lib/ai-usage'

// ── Claude tool schemas (same as single generate route) ──────────────────────

function imageTools(platform: string) {
  return [{
    name: 'generate_image_content',
    description: `Generate complete image post content for ${platform}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        caption:      { type: 'string', description: `Caption, max ${CAPTION_LIMITS[platform] ?? 2200} chars` },
        copy:         { type: 'string', description: 'Main body copy' },
        hashtags:     { type: 'string', description: '8–12 hashtags' },
        callToAction: { type: 'string', description: 'Call to action' },
        imagePrompt:  { type: 'string', description: 'Detailed visual description for AI image generation' },
        altText:      { type: 'string', description: 'Accessibility/SEO alt text describing what the image shows — concise, factual, no "image of" prefix, under 125 characters' }
      },
      required: ['caption', 'copy', 'hashtags', 'callToAction', 'imagePrompt', 'altText']
    }
  }]
}

function videoTools(platform: string) {
  const durations = VIDEO_DURATIONS[platform]?.join(', ') ?? '30 seconds, 60 seconds'
  const isYouTube = platform === 'YouTube'
  return [{
    name: 'generate_video_content',
    description: `Generate complete video content for ${platform}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        ...(isYouTube ? { title: { type: 'string', description: 'SEO-friendly video title — under 70 characters so it does not truncate in search/suggested' } } : {}),
        caption:         { type: 'string', description: isYouTube ? 'Video description' : undefined },
        hook:            { type: 'string', description: 'First 3 seconds script' },
        script:          { type: 'string', description: 'Full spoken script' },
        onScreenText:    { type: 'string', description: 'Text overlay suggestions' },
        hashtags:        { type: 'string' },
        callToAction:    { type: 'string' },
        videoConcept:    { type: 'string', description: 'Detailed visual concept for AI video generation' },
        duration:        { type: 'string', description: `Options: ${durations}` },
        thumbnailPrompt: { type: 'string', description: 'Detailed visual description for AI thumbnail generation' }
      },
      required: [...(isYouTube ? ['title'] : []), 'caption', 'hook', 'script', 'onScreenText', 'hashtags', 'callToAction', 'videoConcept', 'duration', 'thumbnailPrompt']
    }
  }]
}

function carouselTools(platform: string) {
  return [{
    name: 'generate_carousel_content',
    description: `Generate carousel content for ${platform}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        caption:      { type: 'string' },
        hashtags:     { type: 'string' },
        callToAction: { type: 'string' },
        slides: {
          type: 'array',
          description: '5–8 slides. First = hook, last = CTA.',
          items: {
            type: 'object',
            properties: {
              slideNumber:  { type: 'number' },
              text:         { type: 'string' },
              imagePrompt:  { type: 'string', description: 'Detailed visual description for AI image generation for this slide' },
              altText:      { type: 'string', description: 'Accessibility/SEO alt text describing what this slide\'s image shows — concise, factual, under 125 characters' }
            },
            required: ['slideNumber', 'text', 'imagePrompt', 'altText']
          }
        }
      },
      required: ['caption', 'hashtags', 'callToAction', 'slides']
    }
  }]
}

// ── Text generation via Claude ────────────────────────────────────────────────

async function generateTextContent(
  platform:    string,
  contentType: string,
  brief: {
    contentGoal:          string
    campaignDescription:  string
    specialInstructions:  string | null
    client: {
      id: string; name: string; industry: string; brandTone: string; targetAudience: string
      brandKeywords?: string | null; contentDos?: string | null
      contentDonts?: string | null; competitorsToAvoid?: string | null
      preferredHashtags?: string | null
    }
  },
  userId: string
): Promise<Record<string, unknown>> {
  const { client } = brief

  const systemPrompt = `You are an expert social media copywriter and content strategist.
You create compelling, on-brand content that resonates with target audiences and drives engagement.
Always match the brand tone exactly and tailor content to the platform's audience and best practices.
When writing image/video prompts, be highly descriptive and specific — these will be used to generate actual AI images and videos.`

  const userPrompt = `Create ${contentType.toLowerCase()} content for ${platform}.

CLIENT BRIEF:
- Client: ${client.name}
- Industry: ${client.industry}
- Brand Tone: ${client.brandTone}
- Target Audience: ${client.targetAudience}
- Campaign Goal: ${brief.contentGoal}
- Campaign Description: ${brief.campaignDescription}
${brief.specialInstructions ? `- Special Instructions: ${brief.specialInstructions}` : ''}${buildBrandVoiceSection(client)}

Generate high-quality, engaging ${platform} ${contentType.toLowerCase()} content.
For image/video prompts, write rich, detailed descriptions suitable for AI generation.`

  const tools = contentType === 'IMAGE'
    ? imageTools(platform)
    : contentType === 'VIDEO'
    ? videoTools(platform)
    : carouselTools(platform)

  const toolName = contentType === 'IMAGE'
    ? 'generate_image_content'
    : contentType === 'VIDEO'
    ? 'generate_video_content'
    : 'generate_carousel_content'

  const response = await claude.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  4096,
    system:      systemPrompt,
    tools,
    tool_choice: { type: 'any' },
    messages:    [{ role: 'user', content: userPrompt }]
  })
  await logAiUsage({ userId, clientId: client.id, toolId: contentType, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === toolName)
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error(`No structured output for ${platform}`)
  return toolUse.input as Record<string, unknown>
}

// ── Ad copy generation (Meta Ads / Google Ads) ────────────────────────────────

async function generateAdCopyContent(
  bp: { platform: string; finalUrl: string | null },
  brief: {
    contentGoal:          string
    campaignDescription:  string
    specialInstructions:  string | null
    client: {
      id: string; name: string; industry: string; brandTone: string; targetAudience: string
      brandKeywords?: string | null; contentDos?: string | null
      contentDonts?: string | null; competitorsToAvoid?: string | null
    }
  },
  userId: string
): Promise<{ generated: Record<string, unknown>; policyFlags: PolicyFlag[] }> {
  const userPrompt = buildAdCopyUserPrompt({
    platform:      bp.platform as 'Meta Ads' | 'Google Ads',
    finalUrl:      bp.finalUrl,
    variantIndex:  1,
    totalVariants: 1,
    brief,
    client: brief.client,
  })

  const tools = bp.platform === 'Meta Ads' ? metaAdCopyTool() : googleAdCopyTool()
  const toolName = bp.platform === 'Meta Ads' ? 'generate_meta_ad_copy' : 'generate_google_ad_copy'

  const response = await claude.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  2048,
    system:      AD_COPY_SYSTEM_PROMPT,
    tools,
    tool_choice: { type: 'any' },
    messages:    [{ role: 'user', content: userPrompt }],
  })
  await logAiUsage({ userId, clientId: brief.client.id, toolId: 'AD_COPY', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === toolName)
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error(`No structured ad copy for ${bp.platform}`)
  const generated = toolUse.input as Record<string, unknown>

  const policyFlags = bp.platform === 'Meta Ads'
    ? validateMetaAdCopy({
        primaryText: generated.primaryText as string,
        headline:    generated.headline as string,
        description: (generated.description as string) ?? null,
      })
    : validateGoogleAdCopy({
        headlines:    (generated.headlines as string[]) ?? [],
        descriptions: (generated.descriptions as string[]) ?? [],
        paths:        (generated.paths as string[]) ?? [],
        businessName: (generated.businessName as string) ?? null,
      })

  return { generated, policyFlags }
}

// ── Blog post generation ───────────────────────────────────────────────────────

async function generateBlogContent(
  bp: { targetKeyword: string | null },
  brief: {
    contentGoal:          string
    campaignDescription:  string
    specialInstructions:  string | null
    client: {
      id: string; name: string; industry: string; brandTone: string; targetAudience: string
      brandKeywords?: string | null; contentDos?: string | null
      contentDonts?: string | null; competitorsToAvoid?: string | null
      preferredHashtags?: string | null
    }
  },
  userId: string
): Promise<Record<string, unknown>> {
  const userPrompt = buildBlogUserPrompt({
    targetKeyword: bp.targetKeyword,
    brief,
    client: brief.client,
  })

  const response = await claude.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  4096,
    system:      BLOG_SYSTEM_PROMPT,
    tools:       blogPostTool(),
    tool_choice: { type: 'any' },
    messages:    [{ role: 'user', content: userPrompt }],
  })
  await logAiUsage({ userId, clientId: brief.client.id, toolId: 'BLOG_POST', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_blog_post')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No structured blog post returned')
  return toolUse.input as Record<string, unknown>
}

// ── Landing page generation ────────────────────────────────────────────────────

async function generateLandingPageContent(
  bp: { targetKeyword: string | null },
  brief: {
    contentGoal:          string
    campaignDescription:  string
    specialInstructions:  string | null
    client: {
      id: string; name: string; industry: string; brandTone: string; targetAudience: string
      brandKeywords?: string | null; contentDos?: string | null
      contentDonts?: string | null; competitorsToAvoid?: string | null
      preferredHashtags?: string | null
    }
  },
  userId: string
): Promise<Record<string, unknown>> {
  const userPrompt = buildLandingPageUserPrompt({
    targetKeyword: bp.targetKeyword,
    brief,
    client: brief.client,
  })

  const response = await claude.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  4096,
    system:      LANDING_PAGE_SYSTEM_PROMPT,
    tools:       landingPageTool(),
    tool_choice: { type: 'any' },
    messages:    [{ role: 'user', content: userPrompt }],
  })
  await logAiUsage({ userId, clientId: brief.client.id, toolId: 'LANDING_PAGE', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_landing_page')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No structured landing page returned')
  return toolUse.input as Record<string, unknown>
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { briefId, skipMedia = false } = await req.json()
  if (!briefId) return NextResponse.json({ error: 'briefId required' }, { status: 400 })

  const brief = await prisma.brief.findUnique({
    where:   { id: briefId },
    include: { client: true, platforms: true }
  })

  if (!brief) return NextResponse.json({ error: 'Brief not found' }, { status: 404 })

  // Delete existing content for all platforms in this brief
  await prisma.content.deleteMany({ where: { briefId } })

  const results = []
  const errors: string[] = []

  // Generate sequentially to avoid rate limits
  for (const bp of brief.platforms) {
    try {
      if (bp.contentType === 'AD_COPY') {
        const { generated, policyFlags } = await generateAdCopyContent(bp, brief, session.user.id)
        const content = await prisma.content.create({
          data: {
            briefId,
            briefPlatformId: bp.id,
            platform:        bp.platform,
            contentType:     bp.contentType,
            status:          'PENDING',
            mediaStatus:     'NONE',
            callToAction:    (generated.callToAction as string) ?? null,
            adPrimaryText:   (generated.primaryText as string)  ?? null,
            adHeadline:      (generated.headline as string)     ?? null,
            adDescription:   (generated.description as string)  ?? null,
            adHeadlines:     (generated.headlines as object)    ?? undefined,
            adDescriptions:  (generated.descriptions as object) ?? undefined,
            adPaths:         (generated.paths as object)        ?? undefined,
            businessName:    (generated.businessName as string) ?? null,
            policyFlags:     policyFlags as unknown as object,
            // Bulk "Generate All" always produces variant 1 of 1 per
            // platform row (see the single-iteration loop below) — angle
            // rotation only kicks in via the "Fill N More" flow (/api/generate)
            adAngle:         null,
          },
        })
        results.push(content)
        continue
      }

      if (bp.contentType === 'BLOG_POST') {
        const generated = await generateBlogContent(bp, brief, session.user.id)
        const stripCite = (s: unknown) => typeof s === 'string' ? s.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '') : s
        const content = await prisma.content.create({
          data: {
            briefId,
            briefPlatformId: bp.id,
            platform:        bp.platform,
            contentType:     bp.contentType,
            status:          'PENDING',
            mediaStatus:     'NONE',
            title:           (generated.title as string)           ?? null,
            metaTitle:       (generated.metaTitle as string)       ?? null,
            metaDescription: (generated.metaDescription as string) ?? null,
            slug:            (generated.slug as string)            ?? null,
            excerpt:         stripCite(generated.excerpt)          as string ?? null,
            body:            stripCite(generated.body)             as string ?? null,
          },
        })
        results.push(content)
        continue
      }

      if (bp.contentType === 'LANDING_PAGE') {
        const generated = await generateLandingPageContent(bp, brief, session.user.id)
        const stripCite = (s: unknown) => typeof s === 'string' ? s.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '') : s
        const content = await prisma.content.create({
          data: {
            briefId,
            briefPlatformId: bp.id,
            platform:        bp.platform,
            contentType:     bp.contentType,
            status:          'PENDING',
            mediaStatus:     'NONE',
            title:           (generated.title as string)           ?? null,
            metaTitle:       (generated.metaTitle as string)       ?? null,
            metaDescription: (generated.metaDescription as string) ?? null,
            slug:            (generated.slug as string)            ?? null,
            excerpt:         stripCite(generated.excerpt)          as string ?? null,
            body:            stripCite(generated.body)             as string ?? null,
          },
        })
        results.push(content)
        continue
      }

      const generated = await generateTextContent(bp.platform, bp.contentType, brief, session.user.id)

      // Save text content immediately
      const content = await prisma.content.create({
        data: {
          briefId,
          briefPlatformId: bp.id,
          platform:        bp.platform,
          contentType:     bp.contentType,
          status:          'PENDING',
          mediaStatus:     skipMedia ? 'NONE' : 'GENERATING',
          title:           (generated.title as string)         ?? null,
          caption:         generated.caption as string,
          copy:            (generated.copy as string)         ?? null,
          hashtags:        generated.hashtags as string,
          callToAction:    generated.callToAction as string,
          imagePrompt:     (generated.imagePrompt as string)  ?? null,
          altText:         (generated.altText as string)      ?? null,
          slides:          (generated.slides as object)       ?? null,
          hook:            (generated.hook as string)         ?? null,
          script:          (generated.script as string)       ?? null,
          onScreenText:    (generated.onScreenText as string) ?? null,
          videoConcept:    (generated.videoConcept as string) ?? null,
          duration:        (generated.duration as string)     ?? null,
          thumbnailPrompt: (generated.thumbnailPrompt as string) ?? null,
        }
      })

      // Generate media (skipped when text-only mode)
      if (skipMedia) {
        results.push({ ...content, mediaStatus: 'NONE' })
        continue
      }

      try {
        if (bp.contentType === 'IMAGE' && generated.imagePrompt) {
          const imageUrl = await generateImage(generated.imagePrompt as string, bp.platform, 'IMAGE')
          await prisma.content.update({
            where: { id: content.id },
            data:  { imageUrl, mediaStatus: 'READY' }
          })
          results.push({ ...content, imageUrl, mediaStatus: 'READY' })

        } else if (bp.contentType === 'VIDEO' && generated.thumbnailPrompt && generated.videoConcept && generated.hook) {
          const { thumbnailUrl, mediaJobId } = await generateThumbnailAndStartVideo(
            generated.thumbnailPrompt as string,
            generated.videoConcept as string,
            generated.hook as string,
            bp.platform
          )
          await prisma.content.update({
            where: { id: content.id },
            data:  { thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' }
          })
          results.push({ ...content, thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' })

        } else if (bp.contentType === 'CAROUSEL' && generated.slides) {
          const rawSlides = generated.slides as SlideInput[]
          const slidesWithImages = await generateCarouselImages(rawSlides, bp.platform)
          await prisma.content.update({
            where: { id: content.id },
            data:  { slides: JSON.parse(JSON.stringify(slidesWithImages)), mediaStatus: 'READY' }
          })
          results.push({ ...content, slides: slidesWithImages, mediaStatus: 'READY' })

        } else {
          await prisma.content.update({ where: { id: content.id }, data: { mediaStatus: 'FAILED' } })
          results.push({ ...content, mediaStatus: 'FAILED' })
        }
      } catch (mediaErr) {
        console.error(`Media generation failed for ${bp.platform}:`, mediaErr)
        await prisma.content.update({ where: { id: content.id }, data: { mediaStatus: 'FAILED' } })
        results.push({ ...content, mediaStatus: 'FAILED' })
        errors.push(`${bp.platform} (${bp.contentType}) media: ${mediaErr instanceof Error ? mediaErr.message : 'Unknown error'}`)
      }

    } catch (err) {
      errors.push(`${bp.platform} (${bp.contentType}): ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    generated: results.length,
    errors,
    success:   errors.length === 0,
  })
}
