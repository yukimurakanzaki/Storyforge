// tests/lib/context-loader.test.ts
import { describe, it, expect } from 'vitest'
import { formatContextBlock } from '@/lib/analysis/context-loader'

describe('formatContextBlock', () => {
  it('returns empty string when nothing is set', () => {
    expect(formatContextBlock(null, null)).toBe('')
  })
  it('includes industry, compliance, tech defaults and PRD template', () => {
    const block = formatContextBlock({
      industry: 'fintech', role: 'PM', compliance: ['OJK'],
      techDefaults: { storage: 'S3' }, standingInstructions: 'Selalu pakai Bahasa Indonesia.', prdTemplate: 'PAKAI TEMPLATE X',
    }, null)
    expect(block).toContain('fintech')
    expect(block).toContain('OJK')
    expect(block).toContain('storage: S3')
    expect(block).toContain('PAKAI TEMPLATE X')
    expect(block).toContain('Selalu pakai Bahasa Indonesia.')
  })
})
