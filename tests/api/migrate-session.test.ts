import { describe, it, expect } from 'vitest'
import { validateMigratePayload } from '@/app/api/migrate-session/route'

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

describe('validateMigratePayload', () => {
  it('rejects payload over 512KB', () => {
    const result = validateMigratePayload(600_000, undefined)
    expect(result).toEqual({ valid: false, error: 'Payload too large', status: 413 })
  })

  it('rejects brdText over 150,000 chars', () => {
    const result = validateMigratePayload(100, 'x'.repeat(150_001))
    expect(result).toEqual({ valid: false, error: 'BRD text too large', status: 413 })
  })

  it('accepts valid payload', () => {
    const result = validateMigratePayload(100, 'some brd text')
    expect(result).toEqual({ valid: true })
  })

  it('accepts missing brdText', () => {
    const result = validateMigratePayload(100, undefined)
    expect(result).toEqual({ valid: true })
  })
})
