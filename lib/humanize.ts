/**
 * Humanize & Originality Check — a second-pass Claude call over an already
 * generated blog body: (a) rewrites it to read naturally/human-written while
 * preserving meaning and the target keyword, (b) spot-checks a handful of
 * distinctive sentences from the original against live web search results
 * and flags any close match.
 *
 * Uses a real Claude tool (not JSON-in-text) for the structured output,
 * combined with the web_search_20250305 tool via tool_choice: 'auto' so the
 * model is free to search first and call the finalize tool once it's done —
 * the same content-array shape (server_tool_use/web_search_tool_result for
 * search, tool_use for the custom tool) already used successfully for
 * blog/ad-copy generation elsewhere in this repo.
 *
 * An earlier version asked the model to hand-write a JSON object as plain
 * text. That worked most of the time but failed live on a real full-length
 * article body: the model emitted a literal unescaped `"` inside a JSON
 * string value (`Someone in Pune types "best bakery near me"...`), producing
 * JSON.parse-breaking output. Claude's tool-use argument encoding is done by
 * the API layer, not hand-typed by the model, so it doesn't have this
 * failure mode — same reason lib/blog-content.ts and lib/ad-copy.ts have
 * never hit it despite generating similarly long text.
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

2. ORIGINALITY CHECK: using the web_search tool, pick 3-5 of the most distinctive sentences or phrases from the ORIGINAL article body (not your rewrite) and search for them. Flag any sentence that returns a close or near-verbatim match on the live web, with the source URL. If nothing close is found for a sentence, don't flag it.

Do both web searches you need FIRST. Once you're done searching, call the submit_humanized_content tool exactly once with your final rewritten article and originality findings — don't emit any other text response.`

function toolSchema() {
  return [{
    name: 'submit_humanized_content',
    description: 'Submit the rewritten article body and originality check results',
    input_schema: {
      type: 'object' as const,
      properties: {
        revisedBody: { type: 'string', description: 'The full rewritten article in Markdown, same headings/structure as the original' },
        originalityScore: {
          type: 'number',
          description: '0-100. 100 means nothing found anywhere close to the original wording; lower means more/closer matches were found. 95-100 if no flags.',
        },
        flags: {
          type: 'array',
          description: 'Close/near-verbatim matches found via web search. Empty array if none.',
          items: {
            type: 'object',
            properties: {
              excerpt:   { type: 'string', description: 'The original sentence or phrase that matched' },
              sourceUrl: { type: 'string', description: 'URL of the matching source' },
              note:      { type: 'string', description: 'Short description of how close the match is' },
            },
            required: ['excerpt', 'sourceUrl', 'note'],
          },
        },
      },
      required: ['revisedBody', 'originalityScore', 'flags'],
    },
  }]
}

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
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
      ...toolSchema(),
    ],
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: buildUserPrompt(body, targetKeyword) }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_humanized_content')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Humanize & Check: AI did not call the finalize tool')
  }

  const generated = toolUse.input as Record<string, unknown>
  if (typeof generated.revisedBody !== 'string' || typeof generated.originalityScore !== 'number') {
    throw new Error('Humanize & Check: AI response missing required fields')
  }

  const stripCite = (s: string) => s.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '')

  const flags = Array.isArray(generated.flags) ? generated.flags as OriginalityFlag[] : []

  return {
    revisedBody: stripCite(generated.revisedBody),
    originalityScore: Math.max(0, Math.min(100, Math.round(generated.originalityScore))),
    flags: flags.map(f => ({ ...f, excerpt: stripCite(f.excerpt ?? ''), note: stripCite(f.note ?? '') })),
  }
}
