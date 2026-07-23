import { prisma } from './prisma'

// Sonnet-tier per-token pricing — same figures Drishti's AI client uses
// (services/ai/client.ts), so the two apps' cost estimates stay comparable
// on the CRM's combined AI Usage Report. An estimate only, not a bill.
const COST_PER_INPUT_TOKEN = 0.000003
const COST_PER_OUTPUT_TOKEN = 0.000015

/**
 * Records one Claude API call's token usage/estimated cost. Never throws —
 * a logging failure must not break the actual content generation it's
 * measuring. Call this right after each `claude.messages.create()`.
 */
export async function logAiUsage(params: {
  userId: string
  clientId?: string | null
  toolId: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  try {
    const costUsd = params.inputTokens * COST_PER_INPUT_TOKEN + params.outputTokens * COST_PER_OUTPUT_TOKEN

    await prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        clientId: params.clientId ?? null,
        toolId: params.toolId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd,
      },
    })
  } catch (err) {
    console.error('AI usage logging failed:', err)
  }
}
