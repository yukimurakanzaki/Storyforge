import { describe, it, expect } from 'vitest'
import { shouldUseE2ETestUser } from '@/lib/supabase/middleware'

// P0-03: the E2E auth backdoor must be inert in production.
describe('shouldUseE2ETestUser (E2E backdoor gate)', () => {
  it('is DISABLED in production even with header + cookie present', () => {
    expect(shouldUseE2ETestUser('true', true, 'production')).toBe(false)
  })

  it('is enabled in development with header + cookie (Playwright path)', () => {
    expect(shouldUseE2ETestUser('true', true, 'development')).toBe(true)
  })

  it('is enabled in the test env with header + cookie', () => {
    expect(shouldUseE2ETestUser('true', true, 'test')).toBe(true)
  })

  it('requires the x-e2e-test header to be exactly "true"', () => {
    expect(shouldUseE2ETestUser(null, true, 'development')).toBe(false)
    expect(shouldUseE2ETestUser('false', true, 'development')).toBe(false)
  })

  it('requires the e2e auth cookie', () => {
    expect(shouldUseE2ETestUser('true', false, 'development')).toBe(false)
  })
})
