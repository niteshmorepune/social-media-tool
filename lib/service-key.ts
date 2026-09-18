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
 */

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30
const recentHits = new Map<string, number[]>()

export function isServiceKeyRequest(req: Request, routeLabel: string): boolean {
  const provided = req.headers.get('x-service-key')
  const expected = process.env.SMDOST_SERVICE_KEY

  if (!provided || !expected) return false

  if (!timingSafeStringsEqual(provided, expected)) {
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
