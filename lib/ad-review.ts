/**
 * AI Ad Review — a second-pass Claude call that critiques already-generated
 * ad copy (Meta or Google) for persuasive/strategic quality, on demand.
 *
 * Deliberately critique-only: returns a score + specific suggestions, never
 * rewrites or auto-applies anything. The team reads the feedback and either
 * hand-edits the copy or uses the existing "Regenerate with Direction" flow,
 * feeding the critique back in as the direction. Same "AI drafts/advises, a
 * human decides" shape as every other AI feature in this app — an
 * auto-loop that silently rewrites and re-scores itself until some quality
 * target would be a real behavior change this app has consistently avoided.
 *
 * Deliberately does NOT re-check character limits or platform policy —
 * lib/ad-copy-policy.ts already does that deterministically right after
 * generation. This is scored on strategic/persuasive quality only, so the
 * two checks don't produce overlapping or contradictory feedback.
 */

import claude from './claude'

export interface AdReviewFlag {
  severity: 'strength' | 'suggestion'
  field: string
  message: string
}

export interface AdReviewResult {
  score: number
  feedback: AdReviewFlag[]
  inputTokens: number
  outputTokens: number
}

const AD_REVIEW_SYSTEM_PROMPT = `You are a senior paid-ads strategist reviewing ad copy someone else already wrote, for persuasive/strategic quality only.

Do NOT comment on character limits, capitalization, or platform advertising policy (pricing disclosure, personal attributes, etc.) — a separate deterministic check already covers that.

Evaluate:
1. DISTINCTIVENESS — for Google, does each headline/description genuinely test a different angle, benefit, or hook, or are several just reworded restatements of the same idea (Google mixes and matches these, so near-duplicates waste a slot)? For Meta, is the single variant's angle clear and specific, not generic?
2. CTA STRENGTH — is the call-to-action specific and matched to the likely campaign goal, or a weak/generic default?
3. VALUE PROPOSITION CLARITY — would a stranger immediately understand what's being offered and why it matters, or is it vague/abstract?
4. SPECIFICITY — does it use concrete detail (a real outcome, a real differentiator) rather than filler language ("quality service", "best in the industry") that says nothing?
${''}
Call the submit_ad_review tool exactly once. Be honest — call out genuine strengths as strengths, not just problems. A score of 85+ means the copy is close to ready to run as-is; below 60 means significant rework is worth doing before this is worth testing with real spend.`

function toolSchema() {
  return [{
    name: 'submit_ad_review',
    description: 'Submit the ad copy quality review',
    input_schema: {
      type: 'object' as const,
      properties: {
        score: { type: 'number', description: '0-100 overall persuasive/strategic quality score' },
        feedback: {
          type: 'array',
          description: 'Specific, actionable points — both genuine strengths and concrete suggestions. Reference the actual field/headline/description text, not generic advice.',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['strength', 'suggestion'] },
              field: { type: 'string', description: 'Which field this is about, e.g. "headline 3" or "primaryText" or "callToAction"' },
              message: { type: 'string', description: 'The specific observation or suggestion' },
            },
            required: ['severity', 'field', 'message'],
          },
        },
      },
      required: ['score', 'feedback'],
    },
  }]
}

function buildUserPrompt(platform: 'Meta Ads' | 'Google Ads', copy: Record<string, unknown>, goal: string): string {
  return `PLATFORM: ${platform}
CAMPAIGN GOAL: ${goal}

AD COPY TO REVIEW:
${JSON.stringify(copy, null, 2)}`
}

export async function runAdReview(
  platform: 'Meta Ads' | 'Google Ads',
  copy: Record<string, unknown>,
  goal: string,
): Promise<AdReviewResult> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: AD_REVIEW_SYSTEM_PROMPT,
    tools: toolSchema(),
    tool_choice: { type: 'tool', name: 'submit_ad_review' },
    messages: [{ role: 'user', content: buildUserPrompt(platform, copy, goal) }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_ad_review')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI Ad Review: AI did not call the finalize tool')
  }

  const result = toolUse.input as Record<string, unknown>
  if (typeof result.score !== 'number' || !Array.isArray(result.feedback)) {
    throw new Error('AI Ad Review: AI response missing required fields')
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(result.score))),
    feedback: result.feedback as AdReviewFlag[],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
