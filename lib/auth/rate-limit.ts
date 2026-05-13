/**
 * Server-side in-memory sliding window rate limiter for auth endpoints.
 *
 * Protects login and password reset endpoints from brute-force attacks by
 * tracking individual attempt timestamps per IP. Each timestamp expires
 * independently after the 15-minute window, providing more precise rate
 * limiting than a simple counter with window start.
 *
 * Limitation: in-memory state is per-process. On Vercel, multiple serverless
 * instances each have their own state, so limits are approximate. This is
 * acceptable for beta; replace with Upstash Redis for strict enforcement.
 */

export interface SlidingWindowEntry {
  timestamps: number[]
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number | null
}

export type RateLimitAction = 'login' | 'reset'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5
const MAX_RESET_ATTEMPTS = 3
const MAX_ENTRIES = 5000 // prevent unbounded memory growth

const loginBuckets = new Map<string, SlidingWindowEntry>()
const resetBuckets = new Map<string, SlidingWindowEntry>()

function getBucket(action: RateLimitAction): Map<string, SlidingWindowEntry> {
  return action === 'login' ? loginBuckets : resetBuckets
}

function getMaxAttempts(action: RateLimitAction): number {
  return action === 'login' ? MAX_LOGIN_ATTEMPTS : MAX_RESET_ATTEMPTS
}

function pruneOldEntries(bucket: Map<string, SlidingWindowEntry>, now: number): void {
  if (bucket.size < MAX_ENTRIES) return
  const cutoff = now - WINDOW_MS
  for (const [key, entry] of bucket.entries()) {
    // Remove entries where all timestamps have expired
    const valid = entry.timestamps.filter((ts) => ts > cutoff)
    if (valid.length === 0) {
      bucket.delete(key)
    } else {
      entry.timestamps = valid
    }
  }
}

/**
 * Filter timestamps to only those within the current sliding window.
 */
function getValidTimestamps(timestamps: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS
  return timestamps.filter((ts) => ts > cutoff)
}

/**
 * Check if an IP is allowed to perform the given auth action.
 * Returns whether the attempt is allowed, remaining attempts, and retry-after seconds if blocked.
 */
export function checkAuthRateLimit(ip: string, action: RateLimitAction): RateLimitResult {
  const now = Date.now()
  const bucket = getBucket(action)
  const maxAttempts = getMaxAttempts(action)

  const entry = bucket.get(ip)

  if (!entry) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: null }
  }

  // Filter to only timestamps within the current window
  const validTimestamps = getValidTimestamps(entry.timestamps, now)

  // Update the entry with only valid timestamps
  if (validTimestamps.length === 0) {
    bucket.delete(ip)
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: null }
  }

  entry.timestamps = validTimestamps

  if (validTimestamps.length >= maxAttempts) {
    // Rate limited — calculate retry-after based on the oldest valid timestamp
    const oldestTimestamp = validTimestamps[0]
    const retryAfterMs = (oldestTimestamp + WINDOW_MS) - now
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    }
  }

  return {
    allowed: true,
    remaining: maxAttempts - validTimestamps.length,
    retryAfterSeconds: null,
  }
}

/**
 * Record a failed auth attempt for the given IP and action.
 * Pushes the current timestamp into the sliding window bucket.
 */
export function recordAuthFailure(ip: string, action: RateLimitAction): void {
  const now = Date.now()
  const bucket = getBucket(action)

  pruneOldEntries(bucket, now)

  const entry = bucket.get(ip)

  if (!entry) {
    bucket.set(ip, { timestamps: [now] })
    return
  }

  // Clean expired timestamps before adding new one
  entry.timestamps = getValidTimestamps(entry.timestamps, now)
  entry.timestamps.push(now)
}

/**
 * Extract client IP from request headers.
 * Uses the first value from x-forwarded-for (Vercel deployment), falls back to "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
