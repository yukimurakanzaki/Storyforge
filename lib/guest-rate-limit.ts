/**
 * Server-side in-memory rate limiter for guest (unauthenticated) AI requests.
 *
 * This prevents abuse of the x-guest-mode header — without this, anyone could
 * call /api/analyze, /api/refine, /api/requirements unlimited times with no auth.
 *
 * Limitation: in-memory state is per-process. On Vercel, multiple serverless
 * instances each have their own state, so limits are approximate. This is
 * acceptable for beta; replace with Upstash Redis for strict enforcement.
 */

interface BucketEntry {
  count: number
  windowStart: number
}

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_GUEST_REQUESTS = 10     // per IP per hour
const MAX_ENTRIES = 5000          // prevent unbounded memory growth

const ipBuckets = new Map<string, BucketEntry>()

function pruneOldEntries() {
  if (ipBuckets.size < MAX_ENTRIES) return
  const cutoff = Date.now() - WINDOW_MS
  for (const [key, entry] of ipBuckets.entries()) {
    if (entry.windowStart < cutoff) ipBuckets.delete(key)
  }
}

export function checkGuestRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const existing = ipBuckets.get(ip)

  // If no entry or window has expired, start fresh
  if (!existing || now - existing.windowStart > WINDOW_MS) {
    pruneOldEntries()
    ipBuckets.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_GUEST_REQUESTS - 1 }
  }

  if (existing.count >= MAX_GUEST_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  existing.count += 1
  return { allowed: true, remaining: MAX_GUEST_REQUESTS - existing.count }
}

export function getClientIp(request: Request): string {
  // Vercel forwards the real IP in x-forwarded-for
  const forwarded = (request.headers as Headers).get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
