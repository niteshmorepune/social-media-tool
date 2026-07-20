/**
 * Blog post generation — Claude tool schema + prompt builder for SEO-optimized
 * long-form articles. Same pattern as lib/ad-copy.ts: a standalone module used
 * by /api/generate, not inline in the route.
 */

import { buildBrandVoiceSection } from './brand-voice'

// ── Claude tool schema ────────────────────────────────────────────────────────

export function blogPostTool() {
  return [{
    name: 'generate_blog_post',
    description: 'Generate one SEO-optimized blog post',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:           { type: 'string', description: 'H1 / display title for the article' },
        metaTitle:       { type: 'string', description: 'SEO <title> tag. Aim for ~60 characters — search engines truncate past this.' },
        metaDescription: { type: 'string', description: 'SEO meta description shown in search results. Aim for ~155 characters.' },
        slug:            { type: 'string', description: 'URL slug: lowercase, hyphen-separated, derived from the title, no special characters' },
        excerpt:         { type: 'string', description: 'One or two sentence summary for a blog listing page' },
        body: {
          type: 'string',
          description: 'Full article in Markdown, using ## and ### headings to structure sections. Naturally incorporate the target keyword throughout — do not keyword-stuff. Do not fabricate statistics, quotes, or sources.',
        },
      },
      required: ['title', 'metaTitle', 'metaDescription', 'slug', 'excerpt', 'body'],
    },
  }]
}

// ── Prompts ────────────────────────────────────────────────────────────────

export const BLOG_SYSTEM_PROMPT = `You are an expert SEO content writer and blog strategist.
You write well-structured, genuinely useful long-form articles that rank well and match the client's brand tone. Follow these rules strictly:

1. Write for the reader first — search-engine optimization comes from being the most useful, clearly structured answer to the topic, not from stuffing keywords.
2. Use the target keyword naturally in the title, meta title, meta description, the first paragraph, and at least one heading — never force it into a sentence where it reads awkwardly.
3. Structure the body with clear ## and ### Markdown headings so it's scannable.
4. Never fabricate statistics, studies, quotes, or named sources. If a claim needs a number, either omit it or phrase it qualitatively.
5. Match the client's brand tone exactly and write toward the stated content goal and target audience.`

export function buildBlogUserPrompt(params: {
  targetKeyword: string | null
  brief: {
    contentGoal: string
    campaignDescription: string
    specialInstructions: string | null
  }
  client: {
    name: string
    industry: string
    brandTone: string
    targetAudience: string
    brandKeywords?: string | null
    contentDos?: string | null
    contentDonts?: string | null
    competitorsToAvoid?: string | null
    preferredHashtags?: string | null
  }
  direction?: string
}): string {
  const { targetKeyword, brief, client, direction } = params

  const directionNote = direction?.trim()
    ? `\n\nREGENERATE DIRECTION (top priority — follow above all else): "${direction.trim()}"`
    : ''

  return `Write one SEO-optimized blog post.

CAMPAIGN BRIEF:
- Client: ${client.name}
- Industry: ${client.industry}
- Brand Tone: ${client.brandTone}
- Target Audience: ${client.targetAudience}
- Content Goal: ${brief.contentGoal}
- Campaign Description: ${brief.campaignDescription}
${brief.specialInstructions ? `- Special Instructions: ${brief.specialInstructions}` : ''}
- Target Keyword: ${targetKeyword ?? '(none given — choose a keyword that best fits the campaign description and industry)'}${buildBrandVoiceSection(client)}${directionNote}`
}
