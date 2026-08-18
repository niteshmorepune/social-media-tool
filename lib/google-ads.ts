/**
 * Push an approved Google Ads Responsive Search Ad into the NEDS house Ads
 * account, so the team can review/activate it in Google Ads instead of
 * retyping headlines/descriptions by hand.
 *
 * Unlike Meta (a standalone Ad Creative object with no budget/targeting
 * fields), Google's API has no equivalent primitive — a Responsive Search Ad
 * can only exist inside an Ad Group, inside a Campaign, which requires a
 * Budget. Confirmed with the owner (2026-08-13): rather than requiring a
 * human to pre-create a shared draft container, this creates its OWN
 * dedicated Campaign+Budget+AdGroup+Ad per push, atomically (Google Ads
 * API's compound `googleAds:mutate` endpoint bundles heterogeneous creates
 * via temporary negative-ID cross-references in one request — all four
 * objects land together or none do).
 *
 * Guardrails, since this (unlike Meta) CAN touch spend-adjacent objects:
 *   1. Campaign, Ad Group, AND the Ad itself are all independently created
 *      PAUSED — three separate flags, so no single accidental "Enable"
 *      click turns anything live.
 *   2. Budget and CPC bid are hardcoded constants below, never derived from
 *      request input — no bug or bad data can inflate them.
 *   3. Manual CPC bidding, not an automated strategy — predictable, no risk
 *      of a fast unplanned spend the moment someone unpauses it.
 *   4. Campaign name is prefixed unmistakably ("DRAFT - DO NOT ACTIVATE") so
 *      it reads as a review item in the real Google Ads UI, not a real
 *      campaign that happens to be paused.
 *   5. No geo/language targeting is set — Google won't meaningfully serve an
 *      untargeted campaign, which is itself a forcing function: a human has
 *      to actively configure targeting before this could ever go live, on
 *      top of un-pausing three separate objects.
 *
 * Residual risk, stated plainly (not hidden): unlike the Meta push, this
 * design CAN spend if someone unpauses all three objects without reviewing
 * the placeholder budget/bid/missing targeting first. The guardrails make
 * that unlikely and loud, not impossible.
 *
 * Phase 1 scope, same as Meta: NEDS's own house Ads account ONLY, gated by
 * GOOGLE_ADS_HOUSE_CLIENT_ID — never a client's ad account.
 */

import { prisma } from './prisma'

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID // the Manager (MCC) account, digits only
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID // the house Ads account objects are created under, digits only
const HOUSE_CLIENT_ID = process.env.GOOGLE_ADS_HOUSE_CLIENT_ID // Client.id for NEDS's own house account
// v17 (the original placeholder here) was already sunset by the time this was
// first live-tested (2026-08-18, HTTP 404 on googleAds:mutate) — confirmed
// v25 is Google's current stable version at that date. API versions retire on
// a schedule (same caution as Meta's graph version pin) — re-verify this
// default periodically rather than assuming it stays correct indefinitely.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v25'

// Hardcoded placeholders, deliberately never derived from request input (see
// guardrail #2 above). Verify these actually clear Google's real minimums
// during sandbox testing — not asserted as confirmed-correct numbers yet.
const DRAFT_BUDGET_MICROS = 100_000_000 // ₹100/day
const DRAFT_CPC_BID_MICROS = 5_000_000 // ₹5 max CPC

export function googleAdsConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && DEVELOPER_TOKEN && LOGIN_CUSTOMER_ID && CUSTOMER_ID && HOUSE_CLIENT_ID)
}

export class GoogleAdsPushError extends Error {}

async function getAccessToken(): Promise<string> {
  let res: Response
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        refresh_token: REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
    })
  } catch {
    throw new GoogleAdsPushError('Could not reach Google\'s OAuth token endpoint — check network/connectivity and try again.')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.access_token) {
    throw new GoogleAdsPushError(`Google rejected the OAuth token refresh: ${body?.error_description || `HTTP ${res.status}`}`)
  }

  return body.access_token as string
}

/**
 * Pushes one Google Ads Content row's copy as a brand-new, fully paused
 * Campaign+Budget+AdGroup+Ad in the house account. Throws
 * GoogleAdsPushError with a caller-safe message on any validation or API
 * failure — callers should catch and store the message on
 * Content.googlePushError rather than letting it bubble as a 500.
 */
export async function pushContentToGoogleAds(contentId: string): Promise<{ adGroupAdResourceName: string }> {
  if (!googleAdsConfigured()) {
    throw new GoogleAdsPushError('Google Ads push is not configured (missing one of GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN / DEVELOPER_TOKEN / LOGIN_CUSTOMER_ID / CUSTOMER_ID / HOUSE_CLIENT_ID).')
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      briefPlatform: { select: { platform: true, finalUrl: true } },
      brief: { select: { clientId: true, client: { select: { name: true } } } },
    },
  })
  if (!content) throw new GoogleAdsPushError('Content not found.')

  if (content.contentType !== 'AD_COPY' || content.briefPlatform.platform !== 'Google Ads') {
    throw new GoogleAdsPushError('Only Google Ads ad copy can be pushed to Google Ads.')
  }
  if (content.status !== 'APPROVED') {
    throw new GoogleAdsPushError('Only approved ad copy can be pushed — approve it first.')
  }
  if (content.brief.clientId !== HOUSE_CLIENT_ID) {
    // Deliberate hard stop, not a soft warning — phase 1 is house-account-only
    // by design (see the module comment above), not by convenience.
    throw new GoogleAdsPushError('Google Ads push is currently limited to NEDS\'s own house account. Client ad accounts need Standard developer-token access scoped to them before this can be extended.')
  }
  const headlines = Array.isArray(content.adHeadlines) ? content.adHeadlines as string[] : []
  const descriptions = Array.isArray(content.adDescriptions) ? content.adDescriptions as string[] : []
  if (headlines.length < 3 || descriptions.length < 2) {
    throw new GoogleAdsPushError('This ad needs at least 3 headlines and 2 descriptions — nothing usable to push.')
  }
  if (!content.briefPlatform.finalUrl) {
    throw new GoogleAdsPushError('This ad has no landing page URL (Final URL) set on the brief — Google requires a destination link.')
  }

  const accessToken = await getAccessToken()

  const paths = Array.isArray(content.adPaths) ? (content.adPaths as string[]) : []
  const campaignName = `⚠️ DRAFT – DO NOT ACTIVATE – ${content.brief.client.name} – ${headlines[0]}`.slice(0, 255)

  const customerPath = `customers/${CUSTOMER_ID}`
  const budgetTemp = `${customerPath}/campaignBudgets/-1`
  const campaignTemp = `${customerPath}/campaigns/-2`
  const adGroupTemp = `${customerPath}/adGroups/-3`
  const adGroupAdTemp = `${customerPath}/adGroupAds/-3~-4`

  const mutateOperations = [
    {
      campaignBudgetOperation: {
        create: {
          resourceName: budgetTemp,
          name: `${campaignName} — Budget`,
          amountMicros: String(DRAFT_BUDGET_MICROS),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false,
        },
      },
    },
    {
      campaignOperation: {
        create: {
          resourceName: campaignTemp,
          name: campaignName,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          campaignBudget: budgetTemp,
          manualCpc: {},
          // Required as of 2026-09-03 (EU political-advertising transparency
          // rule) — CampaignService rejects any create with FieldError.REQUIRED
          // if this is omitted, even for a fully-paused draft with no EU
          // targeting. NEDS ad copy is never political; declare accordingly.
          containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
        },
      },
    },
    {
      adGroupOperation: {
        create: {
          resourceName: adGroupTemp,
          name: `${campaignName} — Ad Group`,
          campaign: campaignTemp,
          status: 'PAUSED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: String(DRAFT_CPC_BID_MICROS),
        },
      },
    },
    {
      adGroupAdOperation: {
        create: {
          resourceName: adGroupAdTemp,
          adGroup: adGroupTemp,
          status: 'PAUSED',
          ad: {
            finalUrls: [content.briefPlatform.finalUrl],
            responsiveSearchAd: {
              headlines: headlines.map(text => ({ text })),
              descriptions: descriptions.map(text => ({ text })),
              path1: paths[0] || undefined,
              path2: paths[1] || undefined,
            },
          },
        },
      },
    },
  ]

  const url = `https://googleads.googleapis.com/${API_VERSION}/${customerPath}/googleAds:mutate`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN!,
        'login-customer-id': LOGIN_CUSTOMER_ID!,
      },
      body: JSON.stringify({ mutateOperations }),
    })
  } catch {
    throw new GoogleAdsPushError('Could not reach the Google Ads API — check network/connectivity and try again.')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    // The top-level error.message (e.g. "Request contains an invalid
    // argument.") is near-useless on its own — Google Ads API nests the
    // actual field-level reason under error.details[].errors[]. Log the raw
    // body (no PII, just campaign-structure validation errors) so a failure
    // is diagnosable from `docker compose logs app` instead of a guessing
    // game, and surface the specific error(s) in the thrown message too.
    console.error('Google Ads mutate rejected:', JSON.stringify(body, null, 2))
    type GoogleAdsFieldError = { message?: string; errorCode?: unknown; location?: { fieldPathElements?: Array<{ fieldName?: string }> } }
    type GoogleAdsErrorDetail = { errors?: GoogleAdsFieldError[] }
    const details = (body?.error?.details ?? []) as GoogleAdsErrorDetail[]
    const detailErrors: GoogleAdsFieldError[] = details.flatMap(d => d.errors ?? [])
    const specific = detailErrors
      .map((e: GoogleAdsFieldError) => {
        const field = e.location?.fieldPathElements?.map(f => f.fieldName).join('.')
        const code = e.errorCode ? JSON.stringify(e.errorCode) : undefined
        return [e.message, field && `(field: ${field})`, code && `[${code}]`].filter(Boolean).join(' ')
      })
      .filter(Boolean)
      .join(' | ')
    const googleMessage = specific || body?.error?.message || `HTTP ${res.status}`
    throw new GoogleAdsPushError(`Google rejected the request: ${googleMessage}`)
  }

  const results = body?.mutateOperationResponses as Array<Record<string, { resourceName?: string }>> | undefined
  const adGroupAdResourceName = results?.[3]?.adGroupAdResult?.resourceName
  if (!adGroupAdResourceName) {
    throw new GoogleAdsPushError('Google accepted the request but did not return the created ad — check the account manually before retrying.')
  }

  await prisma.content.update({
    where: { id: contentId },
    data: { googleAdGroupAdResourceName: adGroupAdResourceName, googlePushedAt: new Date(), googlePushError: null },
  })

  return { adGroupAdResourceName }
}
