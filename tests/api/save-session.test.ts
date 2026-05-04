import { describe, expect, it } from 'vitest'

// Inline helpers mirrored from the route so we can unit-test them
// without importing a Next.js server module.

const MAX_MESSAGES = 30
const MAX_STRING = 2000

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function validateMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > MAX_MESSAGES) return null
  const out: ChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') return null
    if (typeof content !== 'string') return null
    out.push({ role, content: content.slice(0, MAX_STRING) })
  }
  return out
}

describe('validateMessages', () => {
  it('rejects non-array', () => {
    expect(validateMessages(null)).toBeNull()
    expect(validateMessages('text')).toBeNull()
    expect(validateMessages({})).toBeNull()
  })

  it('rejects arrays exceeding MAX_MESSAGES', () => {
    const big = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'x',
    }))
    expect(validateMessages(big)).toBeNull()
  })

  it('rejects invalid role', () => {
    expect(validateMessages([{ role: 'system', content: 'hi' }])).toBeNull()
    expect(validateMessages([{ role: null, content: 'hi' }])).toBeNull()
  })

  it('rejects non-string content', () => {
    expect(validateMessages([{ role: 'user', content: 123 }])).toBeNull()
  })

  it('accepts valid messages', () => {
    const msgs = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'world' },
    ]
    expect(validateMessages(msgs)).toEqual(msgs)
  })

  it('clamps content to MAX_STRING', () => {
    const long = 'x'.repeat(MAX_STRING + 10)
    const result = validateMessages([{ role: 'user', content: long }])
    expect(result?.[0].content.length).toBe(MAX_STRING)
  })

  it('accepts empty array', () => {
    expect(validateMessages([])).toEqual([])
  })
})
