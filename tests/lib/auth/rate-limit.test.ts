import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkAuthRateLimit,
  recordAuthFailure,
  getClientIp,
} from '@/lib/auth/rate-limit'

describe('lib/auth/rate-limit', () => {
  beforeEach(() => {
    // Reset module state between tests by re-importing
    vi.resetModules()
  })

  describe('checkAuthRateLimit', () => {
    it('allows first attempt from a new IP', async () => {
      const { checkAuthRateLimit } = await import('@/lib/auth/rate-limit')
      const result = checkAuthRateLimit('192.168.1.1', 'login')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
      expect(result.retryAfterSeconds).toBeNull()
    })

    it('allows attempts below login threshold (5)', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      // Record 4 failures
      for (let i = 0; i < 4; i++) {
        recordAuthFailure('10.0.0.1', 'login')
      }
      const result = checkAuthRateLimit('10.0.0.1', 'login')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
      expect(result.retryAfterSeconds).toBeNull()
    })

    it('blocks after 5 failed login attempts', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      for (let i = 0; i < 5; i++) {
        recordAuthFailure('10.0.0.2', 'login')
      }
      const result = checkAuthRateLimit('10.0.0.2', 'login')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(900) // max 15 minutes
    })

    it('blocks after 3 failed reset attempts', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      for (let i = 0; i < 3; i++) {
        recordAuthFailure('10.0.0.3', 'reset')
      }
      const result = checkAuthRateLimit('10.0.0.3', 'reset')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('allows attempts after window expires', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      // Mock Date.now to simulate time passing
      const originalNow = Date.now
      let currentTime = originalNow()

      vi.spyOn(Date, 'now').mockImplementation(() => currentTime)

      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        recordAuthFailure('10.0.0.4', 'login')
      }

      // Should be blocked
      let result = checkAuthRateLimit('10.0.0.4', 'login')
      expect(result.allowed).toBe(false)

      // Advance time past 15-minute window
      currentTime += 15 * 60 * 1000 + 1

      // Should be allowed again
      result = checkAuthRateLimit('10.0.0.4', 'login')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)

      vi.spyOn(Date, 'now').mockRestore()
    })

    it('isolates login and reset buckets', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      // Fill up login bucket
      for (let i = 0; i < 5; i++) {
        recordAuthFailure('10.0.0.5', 'login')
      }
      // Reset should still be allowed
      const result = checkAuthRateLimit('10.0.0.5', 'reset')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3)
    })

    it('isolates different IPs', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      // Fill up one IP
      for (let i = 0; i < 5; i++) {
        recordAuthFailure('10.0.0.6', 'login')
      }
      // Different IP should be unaffected
      const result = checkAuthRateLimit('10.0.0.7', 'login')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })
  })

  describe('recordAuthFailure', () => {
    it('creates a new entry for unknown IP', async () => {
      const { checkAuthRateLimit, recordAuthFailure } = await import('@/lib/auth/rate-limit')
      recordAuthFailure('172.16.0.1', 'login')
      const result = checkAuthRateLimit('172.16.0.1', 'login')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('getClientIp', () => {
    it('extracts first IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178' },
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('handles single IP in x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.50' },
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('trims whitespace from IP', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  203.0.113.50  , 70.41.3.18' },
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('returns "unknown" when x-forwarded-for is absent', () => {
      const request = new Request('http://localhost')
      expect(getClientIp(request)).toBe('unknown')
    })
  })
})
