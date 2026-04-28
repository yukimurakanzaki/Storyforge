import { FREE_TIER_LIMIT } from '@/lib/constants'

export const GUEST_USAGE_STORAGE_KEY = 'sf_guest_usage_v1'
const WINDOW_DAYS = 30

interface GuestUsageState {
  count: number
  resetAt: string
}

function buildFreshState(now: Date): GuestUsageState {
  return {
    count: 0,
    resetAt: new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function readGuestUsage(): { count: number; limit: number } {
  if (typeof window === 'undefined') {
    return { count: 0, limit: FREE_TIER_LIMIT }
  }

  const now = new Date()
  const raw = window.localStorage.getItem(GUEST_USAGE_STORAGE_KEY)
  if (!raw) {
    const fresh = buildFreshState(now)
    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(fresh))
    return { count: 0, limit: FREE_TIER_LIMIT }
  }

  try {
    const parsed = JSON.parse(raw) as GuestUsageState
    const resetAt = new Date(parsed.resetAt)
    if (!parsed.resetAt || Number.isNaN(resetAt.getTime()) || now > resetAt) {
      const fresh = buildFreshState(now)
      window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(fresh))
      return { count: 0, limit: FREE_TIER_LIMIT }
    }

    return {
      count: Math.max(0, parsed.count || 0),
      limit: FREE_TIER_LIMIT,
    }
  } catch {
    const fresh = buildFreshState(now)
    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(fresh))
    return { count: 0, limit: FREE_TIER_LIMIT }
  }
}

export function canGuestAnalyze(): { allowed: boolean; count: number; limit: number } {
  const usage = readGuestUsage()
  return {
    ...usage,
    allowed: usage.count < usage.limit,
  }
}

export function incrementGuestUsage(): { count: number; limit: number } {
  const current = readGuestUsage()
  if (typeof window === 'undefined') return current

  const raw = window.localStorage.getItem(GUEST_USAGE_STORAGE_KEY)
  const now = new Date()
  const fallback = buildFreshState(now)
  let nextState = fallback

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GuestUsageState
      nextState = {
        count: current.count + 1,
        resetAt: parsed.resetAt || fallback.resetAt,
      }
    } catch {
      nextState = {
        count: current.count + 1,
        resetAt: fallback.resetAt,
      }
    }
  } else {
    nextState = {
      count: current.count + 1,
      resetAt: fallback.resetAt,
    }
  }

  window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(nextState))

  return { count: nextState.count, limit: FREE_TIER_LIMIT }
}
