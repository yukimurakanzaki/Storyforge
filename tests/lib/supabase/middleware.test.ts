import { describe, expect, it } from 'vitest'
import { isProtectedAppPath, isUnverifiedEmailUser } from '@/lib/supabase/middleware'
import type { User } from '@supabase/supabase-js'

describe('isProtectedAppPath', () => {
  it('protects the base analyze page (exact match)', () => {
    expect(isProtectedAppPath('/analyze')).toBe(true)
  })

  it('protects saved analyze session detail pages', () => {
    expect(isProtectedAppPath('/analyze/session-123')).toBe(true)
  })

  it('protects dashboard, settings, and set-password pages', () => {
    expect(isProtectedAppPath('/dashboard')).toBe(true)
    expect(isProtectedAppPath('/settings')).toBe(true)
    expect(isProtectedAppPath('/set-password')).toBe(true)
  })

  it('does not protect /verify-email so unverified users can access it', () => {
    expect(isProtectedAppPath('/verify-email')).toBe(false)
  })
})


describe('isUnverifiedEmailUser', () => {
  function makeUser(overrides: Partial<User> = {}): User {
    return {
      id: 'test-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com',
      email_confirmed_at: undefined,
      app_metadata: { providers: ['email'] },
      user_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    } as User
  }

  it('returns true for unverified email-only user', () => {
    const user = makeUser({
      email_confirmed_at: undefined,
      app_metadata: { providers: ['email'] },
    })
    expect(isUnverifiedEmailUser(user)).toBe(true)
  })

  it('returns false for verified email user', () => {
    const user = makeUser({
      email_confirmed_at: '2024-01-01T12:00:00Z',
      app_metadata: { providers: ['email'] },
    })
    expect(isUnverifiedEmailUser(user)).toBe(false)
  })

  it('returns false for OAuth user even if email_confirmed_at is null', () => {
    const user = makeUser({
      email_confirmed_at: undefined,
      app_metadata: { providers: ['email', 'google'] },
    })
    expect(isUnverifiedEmailUser(user)).toBe(false)
  })

  it('returns false for Google-only OAuth user', () => {
    const user = makeUser({
      email_confirmed_at: undefined,
      app_metadata: { providers: ['google'] },
    })
    expect(isUnverifiedEmailUser(user)).toBe(false)
  })

  it('returns true when providers is empty and email not confirmed', () => {
    const user = makeUser({
      email_confirmed_at: undefined,
      app_metadata: { providers: [] },
    })
    expect(isUnverifiedEmailUser(user)).toBe(true)
  })

  it('returns true when app_metadata has no providers field', () => {
    const user = makeUser({
      email_confirmed_at: undefined,
      app_metadata: {},
    })
    expect(isUnverifiedEmailUser(user)).toBe(true)
  })
})
