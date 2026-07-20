/**
 * Ad copy generation — Claude tool schemas + prompt builders for Meta Ads and
 * Google Ads. Shared by /api/generate and /api/generate/bulk (same pattern as
 * those routes' own duplicated organic-content tool builders).
 *
 * Character targets live in the tool schema descriptions so the model aims
 * for them directly; docs/ad-copy-policy-checklist.md and lib/ad-copy-policy.ts
 * are the actual enforcement layer — this is best-effort steering, not a
 * guarantee, which is why every generation is re-checked after the fact.
 */

import { META_SOFT_LIMITS, GOOGLE_HARD_LIMITS } from './ad-copy-policy'
import { buildBrandVoiceSection } from './brand-voice'

export const META_CTA_OPTIONS = [
  'Learn More', 'Sign Up', 'Shop Now', 'Get Quote', 'Contact Us',
  'Book Now', 'Download', 'Subscribe', 'Get Offer', 'Send Message',
] as const

// ── Claude tool schemas ───────────────────────────────────────────────────────

export function metaAdCopyTool() {
  return [{
    name: 'generate_meta_ad_copy',
    description: 'Generate one Meta (Facebook/Instagram) ad copy variant',
    input_schema: {
      type: 'object' as const,
      properties: {
        primaryText:  { type: 'string', description: `Main ad text. Aim for ~${META_SOFT_LIMITS.primaryText} characters — Meta truncates with "See more" past this on mobile feed.` },
        headline:     { type: 'string', description: `Short headline. Aim for ~${META_SOFT_LIMITS.headline} characters — some placements show far less.` },
        description:  { type: 'string', description: `Secondary line. Aim for ~${META_SOFT_LIMITS.description} characters — only shown on a few placements.` },
        callToAction: { type: 'string', description: `CTA button label — choose the single best fit from exactly this list: ${META_CTA_OPTIONS.join(', ')}.` },
      },
      required: ['primaryText', 'headline', 'description', 'callToAction'],
    },
  }]
}

export function googleAdCopyTool() {
  return [{
    name: 'generate_google_ad_copy',
    description: 'Generate one Google Responsive Search Ad',
    input_schema: {
      type: 'object' as const,
      properties: {
        headlines: {
          type: 'array',
          description: `8-15 distinct headlines, EACH MUST BE ${GOOGLE_HARD_LIMITS.headline} CHARACTERS OR FEWER (hard limit — Google rejects anything longer). Vary angle/benefit/CTA across them so Google's rotation has real variety to test.`,
          items: { type: 'string' },
        },
        descriptions: {
          type: 'array',
          description: `3-4 distinct descriptions, EACH MUST BE ${GOOGLE_HARD_LIMITS.description} CHARACTERS OR FEWER (hard limit).`,
          items: { type: 'string' },
        },
        paths: {
          type: 'array',
          description: `Up to ${GOOGLE_HARD_LIMITS.maxPaths} display URL path segments (e.g. "services", "pricing"), EACH ${GOOGLE_HARD_LIMITS.path} CHARACTERS OR FEWER.`,
          items: { type: 'string' },
        },
        businessName: { type: 'string', description: `Business name shown in the ad, ${GOOGLE_HARD_LIMITS.businessName} characters or fewer.` },
      },
      required: ['headlines', 'descriptions'],
    },
  }]
}

// ── Prompts ────────────────────────────────────────────────────────────────

export const AD_COPY_SYSTEM_PROMPT = `You are an expert paid-ads copywriter for Meta Ads and Google Ads.
You write persuasive, on-brand ad copy that also complies with platform advertising policy. Follow these rules strictly:

1. NEVER assert or imply that the reader personally has a specific attribute — no health condition, financial hardship, age bracket, religion, sexual orientation, or disability — whether stated directly ("Are you diabetic?") or indirectly ("For people managing blood sugar spikes"). Speak about the offer or a general audience instead ("Manage your health with confidence").
2. NEVER omit or obscure pricing, fees, or conditions. Do not promise results, savings, or availability the brief doesn't actually support. Do not claim to be a different or more established company than the brief describes.
3. Use standard capitalization and punctuation — no ALL-CAPS-FOR-EMPHASIS, no stacked punctuation ("!!!", "???"), no gimmick character substitutions.
4. Match the client's brand tone exactly and write toward the stated campaign goal and target audience.`

export function buildAdCopyUserPrompt(params: {
  platform: 'Meta Ads' | 'Google Ads'
  finalUrl: string | null
  variantIndex: number
  totalVariants: number
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
  }
  direction?: string
}): string {
  const { platform, finalUrl, variantIndex, totalVariants, brief, client, direction } = params

  const varietyNote = totalVariants > 1
    ? `\nVARIANT NOTE: This is ad variant ${variantIndex} of ${totalVariants} for this campaign. Use a distinct angle/hook/benefit from the other variants — don't just reword the same idea.`
    : ''

  const directionNote = direction?.trim()
    ? `\n\nREGENERATE DIRECTION (top priority — follow above all else): "${direction.trim()}"`
    : ''

  const adFormatNote = platform === 'Meta Ads'
    ? 'Generate one Meta (Facebook/Instagram) ad copy variant: primary text, headline, description, and a call-to-action button label.'
    : 'Generate one Google Responsive Search Ad: a pool of headlines and descriptions Google will mix and match, plus optional display path segments and business name.'

  return `${adFormatNote}

CAMPAIGN BRIEF:
- Client: ${client.name}
- Industry: ${client.industry}
- Brand Tone: ${client.brandTone}
- Target Audience: ${client.targetAudience}
- Campaign Goal: ${brief.contentGoal}
- Campaign Description: ${brief.campaignDescription}
${brief.specialInstructions ? `- Special Instructions: ${brief.specialInstructions}` : ''}${finalUrl ? `- Landing Page: ${finalUrl}` : ''}${buildBrandVoiceSection(client)}${directionNote}${varietyNote}`
}
