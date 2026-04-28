import { describe, expect, it } from 'vitest'
import { isProtectedAppPath } from '@/lib/supabase/middleware'

describe('isProtectedAppPath', () => {
  it('does not protect the base analyze page', () => {
    expect(isProtectedAppPath('/analyze')).toBe(false)
  })

  it('protects saved analyze session detail pages', () => {
    expect(isProtectedAppPath('/analyze/session-123')).toBe(true)
  })

  it('protects dashboard, settings, and set-password pages', () => {
    expect(isProtectedAppPath('/dashboard')).toBe(true)
    expect(isProtectedAppPath('/settings')).toBe(true)
    expect(isProtectedAppPath('/set-password')).toBe(true)
  })
})
