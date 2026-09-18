import crypto from 'crypto'

/**
 * Shared guard for every route that accepts X-Service-Key (server-to-server
 * calls from the NEDS CRM). This exact header was the vector abused in the
 * 2026-09-18 Hostinger "botnet activity" suspension — a leaked
 * SMDOST_SERVICE_KEY was used externally to spam ~700 fake Client/User rows
 * into this app over 7 weeks (see CLAUDE.md's
 * hostinger-botnet-smdost-key-leak-incident memory) — so every acceptance
 * point gets the same defense-in-depth, not a bare `===` string compare with
 * no rate limit or logging repeated per-file.
 *
 * Constant-time comparison (via a SHA-256 hash of both values, so differing
 * lengths don't leak through an early bail-out either), a per-route
 * in-memory rate limit (this app runs as a single Next.js instance — no
 * Redis — so a plain in-process window is sufficient; the limiter is keyed
 * by route label, not by caller, since every legitimate caller is the same
 * one CRM), and a log line on every attempt (success and failure).
 *
 * Scoped per PURPOSE, not one universal key for all 4 routes — a leaked key
 * should only grant what that one purpose needs. 'provisioning' (clients,
 * team) is exactly the scope the earlier role-escalation incident abused, so
 * it's kept separate from 'briefs' and 'read'.
 *
 * The legacy unscoped SMDOST_SERVICE_KEY fallback for THIS (inbound) check
 * has been retired — the CRM is confirmed sending its new scoped keys,
 * verified via a real live call, not just deployed code.
 * SMDOST_SERVICE_KEY ITSELF stays exactly as it was, though — do not unset
 * it: lib/crm-webhook.ts still uses it, unchanged, as the real Bearer token
 * this app sends OUTBOUND to the CRM's own webhooks, a separate trust
 * boundary this file's own inbound scoping never touched.
 */

export type ServiceKeyScope = 'provisioning' | 'briefs' | 'read'

const SCOPE_ENV_VAR: Record<ServiceKeyScope, string> = {
  provisioning: 'SMDOST_SERVICE_KEY_PROVISIONING',
  briefs: 'SMDOST_SERVICE_KEY_BRIEFS',
  read: 'SMDOST_SERVICE_KEY_READ',
}

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30
const recentHits = new Map<string, number[]>()

export function isServiceKeyRequest(req: Request, routeLabel: string, scope: ServiceKeyScope): boolean {
  const provided = req.headers.get('x-service-key')
  if (!provided) return false

  const scoped = process.env[SCOPE_ENV_VAR[scope]]

  if (!scoped || !timingSafeStringsEqual(provided, scoped)) {
    console.warn(`[service-key] invalid key presented for ${routeLabel}`)
    return false
  }

  if (!withinRateLimit(routeLabel)) {
    console.warn(`[service-key] rate limit exceeded for ${routeLabel} (max ${MAX_REQUESTS_PER_WINDOW}/min)`)
    return false
  }

  console.info(`[service-key] authenticated call to ${routeLabel}`)
  return true
}

function timingSafeStringsEqual(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a, 'utf8').digest()
  const bHash = crypto.createHash('sha256').update(b, 'utf8').digest()
  return crypto.timingSafeEqual(aHash, bHash)
}

function withinRateLimit(bucket: string): boolean {
  const now = Date.now()
  const timestamps = (recentHits.get(bucket) ?? []).filter((t) => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    recentHits.set(bucket, timestamps)
    return false
  }
  timestamps.push(now)
  recentHits.set(bucket, timestamps)
  return true
}
