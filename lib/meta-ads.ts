/**
 * Push an approved Meta Ads copy variant into the NEDS house ad account's
 * Creative library (POST /act_{account}/adcreatives), so the team can pick
 * it from Ads Manager instead of retyping the primary text/headline/
 * description/CTA by hand.
 *
 * Deliberately creates ONLY the Ad Creative object — no Campaign, Ad Set, or
 * Ad. A Creative has no budget/targeting/schedule fields at all, so this
 * integration can never touch spend, an audience, or activation; a human
 * still builds the actual campaign around the creative in Ads Manager and
 * decides if/when it goes live. See CLAUDE.md-equivalent backlog notes in
 * the CRM repo (Tier 3, Ads Manager write access) for the full design
 * rationale and why this is scoped to Meta + the house account only for now.
 *
 * Phase 1 scope, confirmed with the owner (2026-08-12): NEDS's own house ad
 * account ONLY, gated by META_ADS_HOUSE_CLIENT_ID — never a client's ad
 * account. That's what lets this run on Meta's "Limited Access" tier
 * (verified Business Manager + a live app), skipping Full App Review, which
 * is only required once an app manages ad accounts belonging to OTHER
 * businesses. Extending this to client accounts later is a real, separate
 * scope decision (Full App Review, System User per client account) — not a
 * config toggle.
 */

import { prisma } from './prisma'

const META_ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID // e.g. "act_123456789" or just the numeric id
const META_HOUSE_CLIENT_ID = process.env.META_ADS_HOUSE_CLIENT_ID // Client.id for NEDS's own house account
const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0' // verify against Meta's current stable version before first real use — API versions retire on a schedule

export function metaAdsConfigured(): boolean {
  return Boolean(META_ACCESS_TOKEN && META_AD_ACCOUNT_ID && META_HOUSE_CLIENT_ID)
}

// Maps this app's existing CTA button labels (lib/ad-copy.ts META_CTA_OPTIONS,
// already shown to the model at generation time) to Meta's call_to_action
// `type` enum. VERIFY against Meta's current Marketing API docs before first
// live use — these enum values are Meta's, not ours, and can change.
const CTA_TYPE_MAP: Record<string, string> = {
  'Learn More':    'LEARN_MORE',
  'Sign Up':       'SIGN_UP',
  'Shop Now':      'SHOP_NOW',
  'Get Quote':     'GET_QUOTE',
  'Contact Us':    'CONTACT_US',
  'Book Now':      'BOOK_NOW',
  'Download':      'DOWNLOAD',
  'Subscribe':     'SUBSCRIBE',
  'Get Offer':     'GET_OFFER',
  'Send Message':  'MESSAGE_PAGE',
}

function ctaType(label: string | null): string {
  return (label && CTA_TYPE_MAP[label]) || 'LEARN_MORE'
}

export class MetaAdsPushError extends Error {}

/**
 * Pushes one Meta Ads Content row's copy to the house ad account's Creative
 * library. Throws MetaAdsPushError with a caller-safe message on any
 * validation or API failure — callers should catch and store the message on
 * Content.metaPushError rather than letting it bubble as a 500.
 */
export async function pushContentToMetaCreative(contentId: string): Promise<{ creativeId: string }> {
  if (!metaAdsConfigured()) {
    throw new MetaAdsPushError('Meta Ads push is not configured (missing META_ADS_ACCESS_TOKEN / META_AD_ACCOUNT_ID / META_ADS_HOUSE_CLIENT_ID).')
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      briefPlatform: { select: { platform: true, finalUrl: true } },
      brief: { select: { clientId: true, client: { select: { name: true } } } },
    },
  })
  if (!content) throw new MetaAdsPushError('Content not found.')

  if (content.contentType !== 'AD_COPY' || content.briefPlatform.platform !== 'Meta Ads') {
    throw new MetaAdsPushError('Only Meta Ads ad copy can be pushed to Meta Ads Manager.')
  }
  if (content.status !== 'APPROVED') {
    throw new MetaAdsPushError('Only approved ad copy can be pushed — approve it first.')
  }
  if (content.brief.clientId !== META_HOUSE_CLIENT_ID) {
    // Deliberate hard stop, not a soft warning — phase 1 is house-account-only
    // by design (see the module comment above), not by convenience.
    throw new MetaAdsPushError('Meta Ads push is currently limited to NEDS\'s own house account. Client ad accounts need Full App Review before this can be extended to them.')
  }
  if (!content.adPrimaryText || !content.adHeadline) {
    throw new MetaAdsPushError('This ad is missing primary text or a headline — nothing to push.')
  }
  if (!content.briefPlatform.finalUrl) {
    throw new MetaAdsPushError('This ad has no landing page URL (Final URL) set on the brief — Meta requires a destination link.')
  }

  const payload = {
    name: `${content.brief.client.name} — ${content.adHeadline}`.slice(0, 200),
    object_story_spec: {
      page_id: process.env.META_PAGE_ID, // NEDS's own Facebook Page — required by Meta for a link creative
      link_data: {
        message:     content.adPrimaryText,
        link:        content.briefPlatform.finalUrl,
        name:        content.adHeadline,
        description: content.adDescription || undefined,
        call_to_action: {
          type: ctaType(content.callToAction),
          value: { link: content.briefPlatform.finalUrl },
        },
      },
    },
  }

  const accountPath = META_AD_ACCOUNT_ID!.startsWith('act_') ? META_AD_ACCOUNT_ID : `act_${META_AD_ACCOUNT_ID}`
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${accountPath}/adcreatives`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, access_token: META_ACCESS_TOKEN }),
    })
  } catch {
    throw new MetaAdsPushError('Could not reach the Meta Graph API — check network/connectivity and try again.')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.id) {
    const metaMessage = body?.error?.message || `HTTP ${res.status}`
    throw new MetaAdsPushError(`Meta rejected the request: ${metaMessage}`)
  }

  await prisma.content.update({
    where: { id: contentId },
    data: { metaCreativeId: body.id, metaPushedAt: new Date(), metaPushError: null },
  })

  return { creativeId: body.id as string }
}
