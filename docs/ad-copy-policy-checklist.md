# Ad Copy Policy Checklist — Meta Ads & Google Ads

**Purpose:** single source of truth for generating ad copy (Meta and Google
Ads) inside SMDost, for both NEDS's own campaigns and client campaigns run
through the Performance Marketing service line. Intended to be fed into two
places once the ad-copy generation feature is built:

1. The Claude prompt, as explicit constraints the model must draft within.
2. A deterministic post-generation validator — hard limits get enforced in
   code, content-policy items get **flagged for human review**, never
   silently blocked or silently passed.

**This is not a substitute for the platforms' own ad review.** Meta and
Google both do their own automated + human review after submission; nothing
here guarantees approval. The goal is to catch the common, well-documented
rejection reasons before a human spends time on them — not to promise
compliance.

**Last reviewed:** 2026-07-19. Both platforms revise ad policy frequently
(Meta's Personal Attributes enforcement changed materially as recently as
Q1 2026). Re-check the source links at the bottom before trusting the
specifics below more than ~3-6 months out, and whenever a real ad gets
rejected for a reason not covered here.

---

## Part 1 — Format specs (deterministic, code-enforceable)

### Meta (Facebook/Instagram Feed & Stories ads)

Meta does **not hard-block** on these — going over doesn't stop submission,
it just changes how the ad displays (truncated with "See more", or a field
hidden entirely in some placements). Treat these as **soft limits →
warnings**, not hard validation failures.

| Field | Recommended limit | Notes |
|---|---|---|
| Primary text | 125 characters | Full field allows up to ~2200, but only the first ~125 show before "See more" on mobile feed. |
| Headline | 40 characters | Display window shrinks by placement — as low as 27 on Facebook Feed, ~10 on Reels Overlay. Author for the shortest placement you're running if unsure. |
| Description | 25 characters | Only reliably shown on a handful of placements (Marketplace, Audience Network, Facebook Search, In-Stream Video) — treat as a bonus field, not guaranteed visible. |

**Meta Instant Form (Lead Ads)** — NEDS already runs these (see
`meta-ads-playbook.md` in the CRM repo). These fields **are** hard-limited
by Meta's own form builder:

| Field | Limit |
|---|---|
| Headline / CTA button text | 60 characters (hard) |
| Questions | up to 15 (more questions = more friction/drop-off — keep to what the CRM's auto-mapping actually uses) |
| Privacy policy URL | required — no form can be created without one |
| Custom disclaimer | no character limit |

### Google Ads (Responsive Search Ads)

Google **does hard-block** at the field level — the ad builder UI itself
won't accept more characters. These should be **hard validation failures**,
not warnings.

| Field | Limit | Count |
|---|---|---|
| Headline | 30 characters (hard) | 3–15 required, all 15 recommended |
| Description | 90 characters (hard) | 2–4 required, all 4 recommended |
| Display path | 15 characters (hard) | up to 2 paths |
| Business name | 25 characters (hard) | 1 |

**Character counting rule:** every character in a double-width language
(Japanese, Korean, Chinese) counts as **2** toward the limit. Spaces count
normally. Not relevant to NEDS's current English/Hindi/Marathi copy, but
flag if that ever changes.

---

## Part 2 — Content policy checklist (judgment calls — flag, don't hard-block)

### Meta: Privacy Violations & Personal Attributes (the single most common Meta rejection reason)

Ad copy must never **assert or imply** that someone in the audience has a
specific personal attribute: race, ethnicity, religion or beliefs, age,
sexual orientation or practices, gender identity, disability, physical or
mental health (including any medical condition), financial status
(especially vulnerability), voting status, trade union membership, criminal
record, or that the ad "knows" the person's name.

**Critical nuance (tightened in 2026):** this now covers **indirect,
second-person implications**, not just direct statements. Both of these are
treated the same:
- ❌ "Are you diabetic?"
- ❌ "For people managing blood sugar spikes" (indirect, still rejected)

General "you/your" language is fine on its own — it's only a problem when
combined with a personal attribute:
- ✅ "Meet seniors" / "Gay dating online now!" — group-facing, not
  second-person-attribute-asserting
- ❌ "Meet other seniors" / "Are you gay?" — implies the *reader themself*
  has that attribute

**Practical flag list for the validator** (seed list — extend as real
rejections come in): phrases combining "you"/"your" with any health
condition, age bracket, religion, sexual orientation, financial hardship
term ("struggling with debt", "bad credit"), or disability — whether direct
or dressed up as a "for people who..." framing.

### Meta: Restricted categories

Relevant mainly if a future SMDost client is in one of these verticals
(NEDS's own 8 service lines are not restricted categories, but client work
could be):
- **Health/wellness**: weight-loss and cosmetic products/services are 18+
  only, cannot use specific-amount or time-bound transformation claims
  ("Lose 10kg in 30 days"), cannot use body-shaming or negative-self-image
  framing.
- **Financial products**: 18+ only, cannot directly request PII in ad copy,
  may require advertiser identity verification per country, and any ad
  citing a specific interest rate/return figure must use Meta's own
  standard risk-warning template text (not custom wording).

### Google: Misrepresentation

Ad copy (and the landing page it points to) must not: omit or obscure
billing details/fees, promise offers that aren't actually available, make
unrealistic weight-loss or financial-gain claims, or imply the advertiser is
a different, more reputable company. If a price or "free" claim appears in
the copy, the full cost/condition must be disclosed, not buried later.

### Google: Restricted content categories

Healthcare, financial products, alcohol, gambling, and political content
all require Google certification/verification before ads in that category
will serve at all — this is an account-level gate, not something ad copy
wording alone can fix. Flag if a brief's client/service maps to one of
these categories so a human checks certification status before generating
copy that will just get disapproved regardless of wording.

### Google: Editorial (correctness, not persuasion style)

- Capitalization must follow normal convention — no ALL-CAPS-FOR-EMPHASIS.
- Punctuation/symbols must be used for their actual grammatical purpose —
  no gimmick chars substituted for letters (e.g. "F₹€€ Shipping"), no
  stacked exclamation marks ("Buy Now!!!").
- Standard spelling/grammar; text must be intelligible on its own (no
  keyword-stuffed fragments).
- No excessive/gimmicky spacing (e.g. "B U Y   N O W").

**Practical flag list for the validator**: 3+ consecutive identical
punctuation characters (`!!!`, `???`), any word in ALL CAPS longer than a
normal acronym, non-standard symbol substitution for letters.

---

## Part 3 — How this doc is meant to be used (once the generation feature is built)

- **Hard limits (Part 1, Google row + Meta Instant Form row)** → validator
  rejects/truncates before the draft even reaches human approval.
- **Soft limits (Part 1, Meta Feed/Stories row)** → validator shows a
  character count with a warning past the recommended threshold, doesn't
  block.
- **Content policy (Part 2)** → validator flags a match with a plain-language
  reason ("possible Personal Attributes violation: combines 'you' with a
  health condition"); the human approver sees the flag but the draft still
  goes through the normal SMDost approval flow. Never auto-discard a
  flagged draft — false positives here are expected and the team's
  judgment is the actual gate, same as every other AI-assisted draft in
  this ecosystem.
- **This doc, not the code, is the source of truth for policy specifics.**
  When Meta or Google changes something (they do, often), update this file;
  no redeploy should be needed to pick up a wording/threshold change if the
  eventual implementation reads this file rather than hardcoding the
  numbers.

---

## Sources (verify against these directly if anything here looks stale)

- [About responsive search ads — Google Ads Help](https://support.google.com/google-ads/answer/7684791?hl=en)
- [Google Ads policies overview](https://support.google.com/adspolicy/answer/6008942?hl=en)
- [Google Ads Editorial policy](https://support.google.com/adspolicy/answer/6021546)
- [Google Ads Misrepresentation policy](https://support.google.com/adspolicy/answer/6020955?hl=en-AU)
- [Update to Google Ads Personalized Advertising policy (Jan 2026)](https://support.google.com/adspolicy/answer/16828044?hl=en)
- [Meta: Privacy Violations and Personal Attributes — Transparency Center](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)
- [Meta: Health and Wellness restricted content — Transparency Center](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/)
- [Meta: Create a Lead Ad with Instant Form](https://www.facebook.com/business/help/179258984144385)
