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
import { metaAdCopyTool, googleAdCopyTool, AD_COPY_SYSTEM_PROMPT, buildAdCopyUserPrompt, getAdAngle } from '@/lib/ad-copy'
import { validateMetaAdCopy, validateGoogleAdCopy } from '@/lib/ad-copy-policy'
import { buildBrandVoiceSection } from '@/lib/brand-voice'
import { blogPostTool, BLOG_SYSTEM_PROMPT, buildBlogUserPrompt } from '@/lib/blog-content'
import { landingPageTool, LANDING_PAGE_SYSTEM_PROMPT, buildLandingPageUserPrompt } from '@/lib/landing-page-content'
import { logAiUsage } from '@/lib/ai-usage'

// ── Claude tool schemas ───────────────────────────────────────────────────────

function imageTools(platform: string) {
  return [{
    name: 'generate_image_content',
    description: `Generate complete image post content for ${platform}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        caption:      { type: 'string', description: `Engaging caption, max ${CAPTION_LIMITS[platform] ?? 2200} characters` },
        copy:         { type: 'string', description: 'Main body copy / post text' },
        hashtags:     { type: 'string', description: '8–12 relevant hashtags as a single string' },
        callToAction: { type: 'string', description: 'Clear, compelling call to action' },
        imagePrompt:  { type: 'string', description: 'Detailed visual description for AI image generation — include style, mood, colors, composition, lighting' },
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
        ...(isYouTube ? { title: { type: 'string', description: 'SEO-friendly video title — the single most important element for search/suggested placement, ideally under 70 characters so it does not truncate' } } : {}),
        caption:         { type: 'string', description: isYouTube ? `Video description, max ${CAPTION_LIMITS[platform] ?? 2200} characters` : `Caption for the post, max ${CAPTION_LIMITS[platform] ?? 2200} characters` },
        hook:            { type: 'string', description: 'Attention-grabbing opening line / first 3 seconds script' },
        script:          { type: 'string', description: 'Full spoken script for the video' },
        onScreenText:    { type: 'string', description: 'Text overlay suggestions shown on screen during the video' },
        hashtags:        { type: 'string', description: '8–12 relevant hashtags as a single string' },
        callToAction:    { type: 'string', description: 'Clear call to action at end of video' },
        videoConcept:    { type: 'string', description: 'Detailed visual concept for AI video generation — describe scene, motion, style, mood, lighting, camera movement' },
        duration:        { type: 'string', description: `Recommended duration. Options: ${durations}` },
        thumbnailPrompt: { type: 'string', description: 'Detailed visual description for AI thumbnail generation — include subject, style, colors, composition' }
      },
      required: [...(isYouTube ? ['title'] : []), 'caption', 'hook', 'script', 'onScreenText', 'hashtags', 'callToAction', 'videoConcept', 'duration', 'thumbnailPrompt']
    }
  }]
}

function carouselTools(platform: string) {
  return [{
    name: 'generate_carousel_content',
    description: `Generate complete carousel post content for ${platform}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        caption:      { type: 'string', description: `Caption for the carousel, max ${CAPTION_LIMITS[platform] ?? 2200} characters` },
        hashtags:     { type: 'string', description: '8–12 relevant hashtags as a single string' },
        callToAction: { type: 'string', description: 'Call to action for the final slide' },
        slides: {
          type: 'array',
          description: '5–8 slides. First slide is the hook, last slide is the CTA.',
          items: {
            type: 'object',
            properties: {
              slideNumber:  { type: 'number' },
              text:         { type: 'string', description: 'Slide headline and short body text' },
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

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    briefPlatformId,
    skipMedia = false,
    addPost = false,
    postNumber = 1,
    totalPosts = 1,
    direction,
    contentIdToReplace,
  } = await req.json()

  const briefPlatform = await prisma.briefPlatform.findUnique({
    where: { id: briefPlatformId },
    include: { brief: { include: { client: true } } }
  })

  if (!briefPlatform) {
    return NextResponse.json({ error: 'Brief platform not found' }, { status: 404 })
  }

  const { platform, contentType, brief } = briefPlatform
  const { client } = brief

  // Delete logic: replace a specific item, clear all, or leave existing (addPost)
  if (contentIdToReplace) {
    await prisma.content.delete({ where: { id: contentIdToReplace } })
  } else if (!addPost) {
    await prisma.content.deleteMany({ where: { briefPlatformId } })
  }

  if (contentType === 'AD_COPY') {
    const angle = totalPosts > 1 ? getAdAngle(postNumber) : null
    const userPrompt = buildAdCopyUserPrompt({
      platform: platform as 'Meta Ads' | 'Google Ads',
      finalUrl: briefPlatform.finalUrl,
      variantIndex: postNumber,
      totalVariants: totalPosts,
      angle,
      brief,
      client,
      direction,
    })

    const tools = platform === 'Meta Ads' ? metaAdCopyTool() : googleAdCopyTool()
    const toolName = platform === 'Meta Ads' ? 'generate_meta_ad_copy' : 'generate_google_ad_copy'

    const response = await claude.messages.create({
      model:       'claude-sonnet-4-6',
      max_tokens:  2048,
      system:      AD_COPY_SYSTEM_PROMPT,
      tools,
      tool_choice: { type: 'any' },
      messages:    [{ role: 'user', content: userPrompt }],
    })
    await logAiUsage({ userId: session.user.id, clientId: client.id, toolId: 'AD_COPY', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

    const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === toolName)
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'AI did not return structured ad copy' }, { status: 500 })
    }
    const generated = toolUse.input as Record<string, unknown>

    const policyFlags = platform === 'Meta Ads'
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

    const content = await prisma.content.create({
      data: {
        briefId:         brief.id,
        briefPlatformId,
        platform,
        contentType,
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
        adAngle:         angle?.name ?? null,
      },
    })

    return NextResponse.json(content, { status: 201 })
  }

  if (contentType === 'BLOG_POST') {
    const userPrompt = buildBlogUserPrompt({
      targetKeyword: briefPlatform.targetKeyword,
      brief,
      client,
      direction,
    })

    const response = await claude.messages.create({
      model:       'claude-sonnet-4-6',
      max_tokens:  4096,
      system:      BLOG_SYSTEM_PROMPT,
      tools:       blogPostTool(),
      tool_choice: { type: 'any' },
      messages:    [{ role: 'user', content: userPrompt }],
    })
    await logAiUsage({ userId: session.user.id, clientId: client.id, toolId: 'BLOG_POST', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

    const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_blog_post')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'AI did not return a structured blog post' }, { status: 500 })
    }
    const generated = toolUse.input as Record<string, unknown>
    const stripCite = (s: unknown) => typeof s === 'string' ? s.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '') : s

    const content = await prisma.content.create({
      data: {
        briefId:         brief.id,
        briefPlatformId,
        platform,
        contentType,
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

    return NextResponse.json(content, { status: 201 })
  }

  if (contentType === 'LANDING_PAGE') {
    const userPrompt = buildLandingPageUserPrompt({
      targetKeyword: briefPlatform.targetKeyword,
      brief,
      client,
      direction,
    })

    const response = await claude.messages.create({
      model:       'claude-sonnet-4-6',
      max_tokens:  4096,
      system:      LANDING_PAGE_SYSTEM_PROMPT,
      tools:       landingPageTool(),
      tool_choice: { type: 'any' },
      messages:    [{ role: 'user', content: userPrompt }],
    })
    await logAiUsage({ userId: session.user.id, clientId: client.id, toolId: 'LANDING_PAGE', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

    const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'generate_landing_page')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'AI did not return a structured landing page' }, { status: 500 })
    }
    const generated = toolUse.input as Record<string, unknown>
    const stripCite = (s: unknown) => typeof s === 'string' ? s.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '') : s

    const content = await prisma.content.create({
      data: {
        briefId:         brief.id,
        briefPlatformId,
        platform,
        contentType,
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

    return NextResponse.json(content, { status: 201 })
  }

  const systemPrompt = `You are an expert social media copywriter and content strategist.
You create compelling, on-brand content that resonates with target audiences and drives engagement.
Always match the brand tone exactly and tailor content to the platform's audience and best practices.
When writing image/video prompts, be highly descriptive and specific — these will be used to generate actual AI images and videos.`

  const postVarietyNote = totalPosts > 1
    ? `\nPOST SERIES NOTE: This is post ${postNumber} of ${totalPosts} planned for ${platform} this month. Use a completely distinct angle, hook, and message — vary the format, opening line, and story from the other posts in this series.`
    : ''

  const directionNote = direction?.trim()
    ? `\n\nREGENERATE DIRECTION (top priority — follow this above all else): "${direction.trim()}"`
    : ''

  const userPrompt = `Create ${contentType.toLowerCase()} content for ${platform}.

CLIENT BRIEF:
- Client: ${client.name}
- Industry: ${client.industry}
- Brand Tone: ${client.brandTone}
- Target Audience: ${client.targetAudience}
- Campaign Goal: ${brief.contentGoal}
- Campaign Description: ${brief.campaignDescription}
${brief.specialInstructions ? `- Special Instructions: ${brief.specialInstructions}` : ''}${buildBrandVoiceSection(client)}${directionNote}${postVarietyNote}

Generate high-quality, engaging ${platform} ${contentType.toLowerCase()} content.
For image/video prompts, write rich, detailed descriptions suitable for AI generation — include visual style, mood, colors, lighting, and composition.`

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
    model:        'claude-sonnet-4-6',
    max_tokens:   4096,
    system:       systemPrompt,
    tools,
    tool_choice:  { type: 'any' },
    messages:     [{ role: 'user', content: userPrompt }]
  })
  await logAiUsage({ userId: session.user.id, clientId: client.id, toolId: contentType, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === toolName)
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'AI did not return structured content' }, { status: 500 })
  }

  const generated = toolUse.input as Record<string, unknown>

  // ── Save text content first ───────────────────────────────────────────────
  const content = await prisma.content.create({
    data: {
      briefId:         brief.id,
      briefPlatformId,
      platform,
      contentType,
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

  // ── Generate actual media ─────────────────────────────────────────────────
  if (skipMedia) {
    return NextResponse.json({ ...content, mediaStatus: 'NONE' }, { status: 201 })
  }

  try {
    if (contentType === 'IMAGE' && generated.imagePrompt) {
      const imageUrl = await generateImage(generated.imagePrompt as string, platform, 'IMAGE')
      await prisma.content.update({
        where: { id: content.id },
        data:  { imageUrl, mediaStatus: 'READY' }
      })
      return NextResponse.json({ ...content, imageUrl, mediaStatus: 'READY' }, { status: 201 })
    }

    if (contentType === 'VIDEO' && generated.thumbnailPrompt && generated.videoConcept && generated.hook) {
      const { thumbnailUrl, mediaJobId } = await generateThumbnailAndStartVideo(
        generated.thumbnailPrompt as string,
        generated.videoConcept as string,
        generated.hook as string,
        platform
      )
      await prisma.content.update({
        where: { id: content.id },
        data:  { thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' }
      })
      return NextResponse.json({ ...content, thumbnailUrl, mediaJobId, mediaStatus: 'GENERATING' }, { status: 201 })
    }

    if (contentType === 'CAROUSEL' && generated.slides) {
      const rawSlides = generated.slides as SlideInput[]
      const slidesWithImages = await generateCarouselImages(rawSlides, platform)
      await prisma.content.update({
        where: { id: content.id },
        data:  { slides: JSON.parse(JSON.stringify(slidesWithImages)), mediaStatus: 'READY' }
      })
      return NextResponse.json({ ...content, slides: slidesWithImages, mediaStatus: 'READY' }, { status: 201 })
    }

    // Fallback: no media prompt available
    await prisma.content.update({ where: { id: content.id }, data: { mediaStatus: 'FAILED' } })
    return NextResponse.json({ ...content, mediaStatus: 'FAILED' }, { status: 201 })

  } catch (mediaErr) {
    console.error('Media generation error:', mediaErr)
    await prisma.content.update({ where: { id: content.id }, data: { mediaStatus: 'FAILED' } })
    return NextResponse.json({ ...content, mediaStatus: 'FAILED' }, { status: 201 })
  }
}
