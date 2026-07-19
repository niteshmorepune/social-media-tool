/**
 * Deterministic checks against docs/ad-copy-policy-checklist.md.
 *
 * Two different severities, matching the two different kinds of rule in that
 * doc: 'error' means the platform itself will hard-reject/truncate this as-is
 * (Google's field caps), 'warning' means it's a soft recommendation or a
 * content-policy judgment call (Meta's soft display limits, Personal
 * Attributes, Editorial). Neither severity blocks saving the draft — a human
 * approver always sees the flag and decides, same as every other AI-assisted
 * draft in this app. Never silently truncate or rewrite generated copy here.
 *
 * Keep this in sync by hand with docs/ad-copy-policy-checklist.md when either
 * platform's policy changes — this file is the practical mirror of that doc,
 * not a replacement for it.
 */

export interface PolicyFlag {
  severity: 'error' | 'warning'
  field: string
  message: string
}

export const META_SOFT_LIMITS = {
  primaryText: 125,
  headline: 40,
  description: 25,
} as const

export const GOOGLE_HARD_LIMITS = {
  headline: 30,
  description: 90,
  path: 15,
  businessName: 25,
  minHeadlines: 3,
  maxHeadlines: 15,
  minDescriptions: 2,
  maxDescriptions: 4,
  maxPaths: 2,
} as const

// Seed list only — extend as real rejections surface. Both direct ("are you
// diabetic?") and indirect ("for people managing blood sugar spikes") framing
// are treated the same by Meta, so this only checks for "you/your" + topic
// co-occurring, not a specific grammatical pattern.
const PERSONAL_ATTRIBUTE_TERMS = [
  'diabet', 'blood sugar', 'cancer', 'depress', 'anxiety', 'mental health',
  'disability', 'disabled', 'pregnan', 'weight loss', 'overweight', 'obese',
  'debt', 'bad credit', 'bankrupt', 'struggling financially', 'low income',
  'senior citizen', 'elderly',
  'christian', 'muslim', 'hindu', 'jewish', 'sikh', 'buddhist',
  'gay', 'lesbian', 'bisexual', 'transgender', 'lgbtq',
]

const YOU_YOUR = /\b(you|your|you're|youre)\b/i

const EDITORIAL_PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /([!?])\1{2,}/, message: 'Repeated punctuation (e.g. "!!!") — Google Editorial policy flags gimmicky punctuation.' },
  { re: /\b[A-Z]{4,}\b/, message: 'ALL-CAPS word — Google Editorial policy requires standard capitalization.' },
]

function flagPersonalAttributes(field: string, text: string): PolicyFlag[] {
  if (!YOU_YOUR.test(text)) return []
  const lower = text.toLowerCase()
  const hit = PERSONAL_ATTRIBUTE_TERMS.find(term => lower.includes(term))
  if (!hit) return []
  return [{
    severity: 'warning',
    field,
    message: `Possible Meta Personal Attributes violation: combines "you/your" with "${hit}". Meta rejects both direct ("are you diabetic?") and indirect ("for people managing blood sugar spikes") phrasing — rephrase to speak about the offer/group, not the reader's own condition.`,
  }]
}

function flagEditorial(field: string, text: string): PolicyFlag[] {
  const flags: PolicyFlag[] = []
  for (const { re, message } of EDITORIAL_PATTERNS) {
    if (re.test(text)) flags.push({ severity: 'warning', field, message })
  }
  return flags
}

export function validateMetaAdCopy(input: {
  primaryText: string
  headline: string
  description?: string | null
}): PolicyFlag[] {
  const flags: PolicyFlag[] = []

  if (input.primaryText.length > META_SOFT_LIMITS.primaryText) {
    flags.push({
      severity: 'warning',
      field: 'primaryText',
      message: `${input.primaryText.length} characters — Meta truncates primary text with "See more" past ${META_SOFT_LIMITS.primaryText} on mobile feed. Not a hard limit, but shorten if the key message needs to show in full.`,
    })
  }
  if (input.headline.length > META_SOFT_LIMITS.headline) {
    flags.push({
      severity: 'warning',
      field: 'headline',
      message: `${input.headline.length} characters — recommended max is ${META_SOFT_LIMITS.headline}; some placements (e.g. Reels Overlay) show as few as ~10 characters.`,
    })
  }
  if (input.description && input.description.length > META_SOFT_LIMITS.description) {
    flags.push({
      severity: 'warning',
      field: 'description',
      message: `${input.description.length} characters — recommended max is ${META_SOFT_LIMITS.description}; this field only reliably displays on a handful of placements.`,
    })
  }

  flags.push(...flagPersonalAttributes('primaryText', input.primaryText))
  flags.push(...flagPersonalAttributes('headline', input.headline))
  if (input.description) flags.push(...flagPersonalAttributes('description', input.description))

  return flags
}

export function validateGoogleAdCopy(input: {
  headlines: string[]
  descriptions: string[]
  paths?: string[]
  businessName?: string | null
}): PolicyFlag[] {
  const flags: PolicyFlag[] = []
  const paths = input.paths ?? []

  if (input.headlines.length < GOOGLE_HARD_LIMITS.minHeadlines) {
    flags.push({ severity: 'error', field: 'headlines', message: `Only ${input.headlines.length} headlines — Google requires at least ${GOOGLE_HARD_LIMITS.minHeadlines}.` })
  }
  if (input.headlines.length > GOOGLE_HARD_LIMITS.maxHeadlines) {
    flags.push({ severity: 'error', field: 'headlines', message: `${input.headlines.length} headlines exceeds Google's max of ${GOOGLE_HARD_LIMITS.maxHeadlines}.` })
  }
  input.headlines.forEach((h, i) => {
    if (h.length > GOOGLE_HARD_LIMITS.headline) {
      flags.push({ severity: 'error', field: `headlines[${i}]`, message: `"${h}" is ${h.length} characters — Google hard-caps headlines at ${GOOGLE_HARD_LIMITS.headline}; this exact text will be rejected.` })
    }
    flags.push(...flagEditorial(`headlines[${i}]`, h))
  })

  if (input.descriptions.length < GOOGLE_HARD_LIMITS.minDescriptions) {
    flags.push({ severity: 'error', field: 'descriptions', message: `Only ${input.descriptions.length} descriptions — Google requires at least ${GOOGLE_HARD_LIMITS.minDescriptions}.` })
  }
  if (input.descriptions.length > GOOGLE_HARD_LIMITS.maxDescriptions) {
    flags.push({ severity: 'error', field: 'descriptions', message: `${input.descriptions.length} descriptions exceeds Google's max of ${GOOGLE_HARD_LIMITS.maxDescriptions}.` })
  }
  input.descriptions.forEach((d, i) => {
    if (d.length > GOOGLE_HARD_LIMITS.description) {
      flags.push({ severity: 'error', field: `descriptions[${i}]`, message: `"${d}" is ${d.length} characters — Google hard-caps descriptions at ${GOOGLE_HARD_LIMITS.description}.` })
    }
    flags.push(...flagEditorial(`descriptions[${i}]`, d))
  })

  paths.forEach((p, i) => {
    if (p.length > GOOGLE_HARD_LIMITS.path) {
      flags.push({ severity: 'error', field: `paths[${i}]`, message: `"${p}" is ${p.length} characters — Google hard-caps display paths at ${GOOGLE_HARD_LIMITS.path}.` })
    }
  })

  if (input.businessName && input.businessName.length > GOOGLE_HARD_LIMITS.businessName) {
    flags.push({ severity: 'error', field: 'businessName', message: `${input.businessName.length} characters — Google hard-caps business name at ${GOOGLE_HARD_LIMITS.businessName}.` })
  }

  return flags
}
