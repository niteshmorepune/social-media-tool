/**
 * Landing page generation — Claude tool schema + prompt builder for a
 * conversion-focused landing page. Mirrors lib/blog-content.ts (same
 * standalone-module pattern, same Content field group: title/metaTitle/
 * metaDescription/slug/excerpt/body) but the fields carry different meaning
 * and the prompt targets conversion, not article-style SEO content:
 * title/excerpt become the hero headline/subheadline, body holds the rest
 * of the page in Markdown sections (benefits, social proof, CTA) instead of
 * a linear article.
 */

import { buildBrandVoiceSection } from './brand-voice'

// ── Claude tool schema ────────────────────────────────────────────────────────

export function landingPageTool() {
  return [{
    name: 'generate_landing_page',
    description: 'Generate one conversion-focused landing page',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:           { type: 'string', description: 'Hero headline (H1) — states the core value proposition in one line' },
        metaTitle:       { type: 'string', description: 'SEO <title> tag. Aim for ~60 characters — search engines truncate past this.' },
        metaDescription: { type: 'string', description: 'SEO meta description shown in search results. Aim for ~155 characters.' },
        slug:            { type: 'string', description: 'URL slug: lowercase, hyphen-separated, derived from the title, no special characters' },
        excerpt:         { type: 'string', description: 'Hero subheadline — one supporting sentence under the H1, expands on the value proposition' },
        body: {
          type: 'string',
          description: 'The rest of the page in Markdown, using ## headings for each section: 3-5 key benefits/features (what the visitor gets, not just what the service does), a trust/social-proof section (use a bracketed placeholder like "[Insert client testimonial/logo here]" — NEVER invent a specific fake customer name, quote, or statistic), and a closing call-to-action section with a clear CTA button label. Naturally incorporate the target keyword — no keyword stuffing.',
        },
      },
      required: ['title', 'metaTitle', 'metaDescription', 'slug', 'excerpt', 'body'],
    },
  }]
}

// ── Prompts ────────────────────────────────────────────────────────────────

export const LANDING_PAGE_SYSTEM_PROMPT = `You are an expert conversion copywriter who writes landing pages that turn visitors into leads/customers.
You write clear, persuasive, benefit-led copy matched to the client's brand tone. Follow these rules strictly:

1. Lead with the visitor's problem/goal, not the company's features — every section should answer "what's in it for me" from the reader's point of view.
2. NEVER invent a specific fake customer name, testimonial quote, review, statistic, or "as seen in" logo claim. Where social proof would go, use an obvious bracketed placeholder like "[Insert client testimonial here]" for the team to fill in with something real — fabricated proof is dishonest and a legal risk if published as-is.
3. Every section should build toward a single, clear call to action — don't split focus across multiple competing CTAs.
4. Use the target keyword naturally in the title, meta title, meta description, and at least one heading — never force it into a sentence where it reads awkwardly.
5. Structure the body with clear ## Markdown headings so it's scannable.
6. Match the client's brand tone exactly and write toward the stated content goal and target audience.`

export function buildLandingPageUserPrompt(params: {
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

  return `Write one conversion-focused landing page.

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
