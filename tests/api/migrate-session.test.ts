import { describe, it, expect } from 'vitest'

// Tests the validation contract inline (mirrors route validation logic)
// Full route requires integration testing via dev server
function validateMigrateBody(body: unknown): { valid: true; id: string } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Missing body' }
  }
  const b = body as Record<string, unknown>
  if (!b.id || typeof b.id !== 'string') {
    return { valid: false, error: 'Missing session id' }
  }
  if (!b.createdAt || typeof b.createdAt !== 'string') {
    return { valid: false, error: 'Missing createdAt' }
  }
  return { valid: true, id: b.id }
}

describe('validateMigrateBody', () => {
  it('rejects null body', () => {
    expect(validateMigrateBody(null)).toEqual({ valid: false, error: 'Missing body' })
  })

  it('rejects body without id', () => {
    expect(validateMigrateBody({ createdAt: '2026-01-01' })).toEqual({
      valid: false,
      error: 'Missing session id',
    })
  })

  it('rejects body without createdAt', () => {
    expect(validateMigrateBody({ id: 'abc' })).toEqual({
      valid: false,
      error: 'Missing createdAt',
    })
  })

  it('accepts valid body', () => {
    expect(validateMigrateBody({ id: 'abc', createdAt: '2026-01-01' })).toEqual({
      valid: true,
      id: 'abc',
    })
  })
})
