/**
 * Outbound webhook utility — fires events from Social Media Dost to the NEDS CRM.
 *
 * Auth: Bearer token using SMDOST_SERVICE_KEY (same secret the CRM uses when
 * calling us, reused for the reverse direction).
 *
 * All calls are fire-and-forget — callers should `.catch(() => null)` so a CRM
 * outage never breaks the content approval flow.
 */

import { prisma } from './prisma'
import { pushBriefToDrishti } from './drishti-push'

const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL?.replace(/\/$/, '')
const SERVICE_KEY = process.env.SMDOST_SERVICE_KEY

/**
 * Check whether every piece of content in a brief is now APPROVED.
 * If so, fire the CRM webhook. Callers should .catch(() => null).
 */
export async function checkAndFireBriefApproved(
  briefId: string,
  clientId: string,
): Promise<void> {
  const [total, approved] = await Promise.all([
    prisma.content.count({ where: { briefId } }),
    prisma.content.count({ where: { briefId, status: 'APPROVED' } }),
  ])

  if (total > 0 && total === approved) {
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      select: { title: true, scheduledMonth: true },
    })
    if (brief) {
      // Fire CRM invoice webhook and Drishti content push concurrently.
      // allSettled so one failure never suppresses the other.
      await Promise.allSettled([
        fireBriefApproved(clientId, briefId, brief.title, brief.scheduledMonth, total),
        pushBriefToDrishti(briefId),
      ])
    }
  }
}

/**
 * Notify the CRM that all content in a brief has been approved.
 * The CRM will create a draft invoice and alert the accounts team.
 */
export async function fireBriefApproved(
  smdostClientId: string,
  briefId: string,
  briefTitle: string,
  scheduledMonth: Date,
  postCount: number,
): Promise<void> {
  if (!CRM_WEBHOOK_URL || !SERVICE_KEY) return

  const url = `${CRM_WEBHOOK_URL}/api/webhooks/smdost/brief-approved`

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      smdost_client_id: smdostClientId,
      brief_id: briefId,
      brief_title: briefTitle,
      scheduled_month: scheduledMonth.toISOString().slice(0, 7), // "YYYY-MM"
      post_count: postCount,
    }),
  })
}
