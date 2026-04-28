import { describe, expect, it } from 'vitest'
import { validateAnalyzePayload } from '@/app/api/analyze/route'

describe('validateAnalyzePayload', () => {
  it('rejects missing body', () => {
    expect(validateAnalyzePayload(null)).toEqual({
      valid: false,
      error: 'Missing request body',
      status: 400,
    })
  })

  it('rejects empty text', () => {
    expect(validateAnalyzePayload({ text: '   ' })).toEqual({
      valid: false,
      error: 'Missing text',
      status: 400,
    })
  })

  it('rejects overly large text', () => {
    expect(validateAnalyzePayload({ text: 'x'.repeat(150_001) })).toEqual({
      valid: false,
      error: 'BRD text too large',
      status: 413,
    })
  })

  it('accepts valid text', () => {
    expect(validateAnalyzePayload({ text: 'Valid BRD' })).toEqual({
      valid: true,
      text: 'Valid BRD',
    })
  })
})
