import { describe, expect, it } from 'vitest'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'

describe('sanitizeAuthRedirectPath', () => {
  it('defaults magic-link auth to the analysis page', () => {
    expect(sanitizeAuthRedirectPath(null)).toBe('/analyze')
    expect(sanitizeAuthRedirectPath('')).toBe('/analyze')
  })

  it('rejects external redirects', () => {
    expect(sanitizeAuthRedirectPath('https://example.com')).toBe('/analyze')
    expect(sanitizeAuthRedirectPath('//example.com')).toBe('/analyze')
  })

  it('preserves safe internal redirects', () => {
    expect(sanitizeAuthRedirectPath('/dashboard')).toBe('/dashboard')
    expect(sanitizeAuthRedirectPath('/analyze')).toBe('/analyze')
  })
})
