/**
 * Humanize & Originality Check — a second-pass Claude call over an already
 * generated blog body: (a) rewrites it to read naturally/human-written while
 * preserving meaning and the target keyword, (b) spot-checks a handful of
 * distinctive sentences from the original against live web search results
 * and flags any close match.
 *
 * Uses plain JSON-in-text output (not Claude tool-calling) because it needs
 * to combine structured output with the web_search_20250305 tool, and the
 * sibling Drishti app (server/src/services/ai/trendIdeas.ts) already proved
 * this is the reliable way to do that combo — forcing tool_choice to a
 * specific custom tool alongside web_search is unvalidated and risks the
 * model skipping the search. Ports two gotchas learned building that
 * feature: (1) once search/tool-use blocks are interleaved, the response's
 * text isn't necessarily content[0] — take the LAST text block; (2) Claude's
 * web_search tool annotates cited claims with raw `<cite index="...">...
 * </cite>` markup that must be stripped before the text is used verbatim.
 */

import claude from './claude'

export interface OriginalityFlag {
  excerpt: string
  sourceUrl: string
  note: string
}

export interface HumanizeResult {
  revisedBody: string
  originalityScore: number
  flags: OriginalityFlag[]
}

const HUMANIZE_SYSTEM_PROMPT = `You are an editor who does two jobs on a given blog article body, in order:

1. REWRITE the article to read naturally and human-written: vary sentence length and rhythm, cut stock AI phrasing ("in today's fast-paced world", "unlock the power of", "delve into", etc.), remove repetitive transitions, and add specific, concrete detail where the original is generic — all while preserving the same meaning, facts, structure (keep the Markdown ## / ### headings), and natural use of the target keyword. Do not shorten it materially.

2. ORIGINALITY CHECK: using web search, pick 3-5 of the most distinctive sentences or phrases from the ORIGINAL article body (not your rewrite) and search for them. Flag any sentence that returns a close or near-verbatim match on the live web, with the source URL. If nothing close is found for a sentence, don't flag it.

Respond with ONLY a JSON object (no markdown fence, no other text) in exactly this shape:
{
  "revisedBody": "the full rewritten article in Markdown",
  "originalityScore": 85,
  "flags": [
    { "excerpt": "the original sentence or phrase that matched", "sourceUrl": "https://...", "note": "short description of how close the match is" }
  ]
}

originalityScore is 0-100: 100 means nothing found anywhere close to the original wording, lower scores mean more/closer matches were found. If no flags were found, return an empty flags array and a score of 95-100.`

function buildUserPrompt(body: string, targetKeyword: string | null): string {
  return `TARGET KEYWORD: ${targetKeyword ?? '(none given)'}

ORIGINAL ARTICLE BODY:
${body}`
}

export async function runHumanizeAndCheck(body: string, targetKeyword: string | null): Promise<HumanizeResult> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: HUMANIZE_SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
    messages: [{ role: 'user', content: buildUserPrompt(body, targetKeyword) }],
  })

  // With web search enabled, search/tool-use blocks can precede the final
  // text block — take the LAST text block, not content[0].
  const textBlocks = response.content.filter(b => b.type === 'text')
  const lastText = textBlocks[textBlocks.length - 1]
  if (!lastText || lastText.type !== 'text') {
    throw new Error('Humanize & Check: AI did not return a text response')
  }

  const stripped = lastText.text
    .replace(/<cite[^>]*>/g, '')
    .replace(/<\/cite>/g, '')

  // The model sometimes wraps the JSON in a markdown fence or adds a line of
  // prose before/after it despite instructions — extract the outermost
  // {...} object rather than anchoring on the string's start/end.
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Humanize & Check: AI response did not contain a JSON object')
  }
  const cleaned = stripped.slice(start, end + 1)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Humanize & Check: could not parse AI response as JSON')
  }

  const result = parsed as Partial<HumanizeResult>
  if (typeof result.revisedBody !== 'string' || typeof result.originalityScore !== 'number') {
    throw new Error('Humanize & Check: AI response missing required fields')
  }

  return {
    revisedBody: result.revisedBody,
    originalityScore: Math.max(0, Math.min(100, Math.round(result.originalityScore))),
    flags: Array.isArray(result.flags) ? result.flags : [],
  }
}
