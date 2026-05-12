import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sseEvent } from '@/lib/sse'

// ---------------------------------------------------------------------------
// Helpers — parse a single SSE event string back into { name, data }
// ---------------------------------------------------------------------------

function parseSSEEvent(raw: string): { name: string; data: unknown } {
  // A well-formed event ends with \n\n; strip the trailing blank line
  const block = raw.replace(/\n\n$/, '')
  const lines = block.split('\n')

  let name = 'message'
  let dataLine = ''

  for (const line of lines) {
    if (line.startsWith('event: ')) name = line.slice(7)
    if (line.startsWith('data: ')) dataLine = line.slice(6)
  }

  return { name, data: JSON.parse(dataLine) }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Event names: printable ASCII, no newlines (SSE field names must be
 * single-line). Restrict to a realistic identifier-like character set.
 */
const eventNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/)

/**
 * JSON-serializable data objects that faithfully round-trip through
 * JSON.stringify → JSON.parse. We exclude -0 (a JS quirk: JSON.stringify(-0)
 * produces "0", so -0 is not representable in JSON).
 */
const jsonValueArb = fc.jsonValue().filter((v) => {
  // Recursively check that no -0 appears anywhere in the value
  const hasNegativeZero = (x: unknown): boolean => {
    if (typeof x === 'number') return Object.is(x, -0)
    if (Array.isArray(x)) return x.some(hasNegativeZero)
    if (x !== null && typeof x === 'object') {
      return Object.values(x as Record<string, unknown>).some(hasNegativeZero)
    }
    return false
  }
  return !hasNegativeZero(v)
})

// ---------------------------------------------------------------------------
// Property 1: SSE event encoding round-trip
// Validates: Requirements 8.1, 8.3
// ---------------------------------------------------------------------------

describe('sseEvent — Property 1: encoding round-trip', () => {
  it('recovers the original name and data after parsing', () => {
    fc.assert(
      fc.property(eventNameArb, jsonValueArb, (name, data) => {
        const encoded = sseEvent(name, data)
        const { name: parsedName, data: parsedData } = parseSSEEvent(encoded)

        expect(parsedName).toBe(name)
        expect(parsedData).toEqual(data)
      }),
      { numRuns: 500 }
    )
  })

  it('always ends with the double-newline SSE terminator', () => {
    fc.assert(
      fc.property(eventNameArb, jsonValueArb, (name, data) => {
        const encoded = sseEvent(name, data)
        expect(encoded.endsWith('\n\n')).toBe(true)
      }),
      { numRuns: 200 }
    )
  })

  it('always contains the event: line before the data: line', () => {
    fc.assert(
      fc.property(eventNameArb, jsonValueArb, (name, data) => {
        const encoded = sseEvent(name, data)
        const eventIdx = encoded.indexOf('event: ')
        const dataIdx = encoded.indexOf('data: ')
        expect(eventIdx).toBeGreaterThanOrEqual(0)
        expect(dataIdx).toBeGreaterThan(eventIdx)
      }),
      { numRuns: 200 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 2: SSE delta events contain only the emitted chunk
// Validates: Requirements 1.2, 4.2
// ---------------------------------------------------------------------------

describe('sseEvent — Property 2: delta chunk fidelity', () => {
  /**
   * Chunks can be any Unicode string including newlines and special chars,
   * since the chunk is JSON-encoded inside the data field.
   */
  const chunkArb = fc.string({ minLength: 0, maxLength: 500 })

  it('encodes the chunk in the text field without truncation or mutation', () => {
    fc.assert(
      fc.property(chunkArb, (chunk) => {
        const encoded = sseEvent('delta', { text: chunk })
        const { name, data } = parseSSEEvent(encoded)

        expect(name).toBe('delta')
        expect((data as { text: string }).text).toBe(chunk)
      }),
      { numRuns: 500 }
    )
  })

  it('handles Unicode, newlines, and special characters without corruption', () => {
    const specialChunks = [
      '',
      '\n',
      '\r\n',
      '\t',
      '\\',
      '"',
      '🎉🚀',
      'こんにちは',
      '<script>alert(1)</script>',
      'line1\nline2\nline3',
      '\u0000\u001F',
    ]

    for (const chunk of specialChunks) {
      const encoded = sseEvent('delta', { text: chunk })
      const { data } = parseSSEEvent(encoded)
      expect((data as { text: string }).text).toBe(chunk)
    }
  })

  it('the data field is valid JSON for any chunk', () => {
    fc.assert(
      fc.property(chunkArb, (chunk) => {
        const encoded = sseEvent('delta', { text: chunk })
        const dataLine = encoded
          .replace(/\n\n$/, '')
          .split('\n')
          .find((l) => l.startsWith('data: '))
          ?.slice(6) ?? ''

        // Must not throw
        expect(() => JSON.parse(dataLine)).not.toThrow()
      }),
      { numRuns: 500 }
    )
  })
})
