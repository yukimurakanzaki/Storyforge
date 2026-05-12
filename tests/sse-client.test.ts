import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readSSEStream, type SSEEvent } from '@/lib/sse-client'
import { sseEvent } from '@/lib/sse'

// ---------------------------------------------------------------------------
// Helper — build a mock Response whose body delivers the given byte chunks
// ---------------------------------------------------------------------------

function mockResponse(chunks: Uint8Array[]): Response {
  let index = 0
  const readable = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++])
      } else {
        controller.close()
      }
    },
  })
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

/**
 * Encode an array of { name, data } pairs as SSE bytes, optionally split
 * across multiple chunks to exercise the partial-chunk buffering path.
 *
 * splitAt: if provided, the concatenated SSE string is split at that byte
 * offset so the reader receives two chunks instead of one.
 */
function encodeEvents(
  events: Array<{ name: string; data: unknown }>,
  splitAt?: number,
): Uint8Array[] {
  const encoder = new TextEncoder()
  const combined = events.map((e) => sseEvent(e.name, e.data)).join('')
  const bytes = encoder.encode(combined)

  if (splitAt !== undefined && splitAt > 0 && splitAt < bytes.length) {
    return [bytes.slice(0, splitAt), bytes.slice(splitAt)]
  }
  return [bytes]
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Event names: single-line, identifier-like strings */
const eventNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/)

/**
 * JSON-serializable values that faithfully round-trip through JSON.
 * Excludes -0 (JSON.stringify(-0) === "0", so it cannot round-trip).
 */
const jsonValueArb = fc.jsonValue().filter((v) => {
  const hasNegativeZero = (x: unknown): boolean => {
    if (typeof x === 'number') return Object.is(x, -0)
    if (Array.isArray(x)) return x.some(hasNegativeZero)
    if (x !== null && typeof x === 'object')
      return Object.values(x as Record<string, unknown>).some(hasNegativeZero)
    return false
  }
  return !hasNegativeZero(v)
})

/** A single { name, data } pair */
const sseEventArb = fc.record({ name: eventNameArb, data: jsonValueArb })

/** A non-empty sequence of SSE events (up to 20) */
const sseEventSeqArb = fc.array(sseEventArb, { minLength: 1, maxLength: 20 })

// ---------------------------------------------------------------------------
// Property 4: SSE client parser correctness
// Validates: Requirements 6.1, 7.1
// ---------------------------------------------------------------------------

describe('readSSEStream — Property 4: SSE client parser correctness', () => {
  it('yields the same sequence of events that were encoded, delivered as one chunk', async () => {
    await fc.assert(
      fc.asyncProperty(sseEventSeqArb, async (events) => {
        const chunks = encodeEvents(events)
        const response = mockResponse(chunks)

        const yielded: SSEEvent[] = []
        for await (const event of readSSEStream(response)) {
          yielded.push(event)
        }

        expect(yielded).toHaveLength(events.length)
        for (let i = 0; i < events.length; i++) {
          expect(yielded[i].name).toBe(events[i].name)
          expect(yielded[i].data).toEqual(events[i].data)
        }
      }),
      { numRuns: 300 },
    )
  })

  it('yields the same sequence when bytes are split mid-stream (partial chunk buffering)', async () => {
    await fc.assert(
      fc.asyncProperty(
        sseEventSeqArb,
        fc.nat({ max: 1000 }),
        async (events, splitOffset) => {
          // Encode all events, then split at a byte offset derived from the
          // arbitrary. We clamp to the actual byte length so the split is valid.
          const encoder = new TextEncoder()
          const combined = events.map((e) => sseEvent(e.name, e.data)).join('')
          const totalBytes = encoder.encode(combined).length
          const splitAt = (splitOffset % Math.max(totalBytes, 1)) + 1

          const chunks = encodeEvents(events, splitAt)
          const response = mockResponse(chunks)

          const yielded: SSEEvent[] = []
          for await (const event of readSSEStream(response)) {
            yielded.push(event)
          }

          expect(yielded).toHaveLength(events.length)
          for (let i = 0; i < events.length; i++) {
            expect(yielded[i].name).toBe(events[i].name)
            expect(yielded[i].data).toEqual(events[i].data)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it('throws when the response has no body', async () => {
    const response = new Response(null)
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of readSSEStream(response)) {
        // should throw before yielding anything
      }
    }).rejects.toThrow('No response body')
  })
})

// ---------------------------------------------------------------------------
// Property 3: SSE stream accumulation round-trip
// Validates: Requirements 1.3, 4.3
// ---------------------------------------------------------------------------

describe('readSSEStream — Property 3: SSE stream accumulation round-trip', () => {
  /**
   * Generate arrays of string chunks whose concatenation is valid JSON.
   * Strategy: generate a JSON value, stringify it, then split the string
   * at random positions into 1–10 chunks.
   */
  const jsonChunksArb = fc
    .tuple(
      jsonValueArb,
      fc.array(fc.nat({ max: 100 }), { minLength: 0, maxLength: 9 }),
    )
    .map(([value, splitPoints]) => {
      const json = JSON.stringify(value)
      if (json.length === 0 || splitPoints.length === 0) return { value, chunks: [json] }

      // Normalise split points to valid indices within the string
      const indices = splitPoints
        .map((p) => (p % json.length) + 1)
        .filter((p, i, arr) => arr.indexOf(p) === i) // deduplicate
        .sort((a, b) => a - b)

      const chunks: string[] = []
      let prev = 0
      for (const idx of indices) {
        if (idx > prev) chunks.push(json.slice(prev, idx))
        prev = idx
      }
      chunks.push(json.slice(prev))
      return { value, chunks: chunks.filter((c) => c.length > 0) }
    })

  it('accumulating chunks one-by-one equals parsing the joined string', () => {
    fc.assert(
      fc.property(jsonChunksArb, ({ value, chunks }) => {
        // Simulate server-side accumulation: concatenate chunks one by one
        let accumulated = ''
        for (const chunk of chunks) {
          accumulated += chunk
        }

        // Both approaches must produce the same result
        const fromJoin = JSON.parse(chunks.join(''))
        const fromAccumulation = JSON.parse(accumulated)

        expect(fromAccumulation).toEqual(fromJoin)
        expect(fromAccumulation).toEqual(value)
      }),
      { numRuns: 500 },
    )
  })

  it('round-trips through SSE delta events: accumulated deltas equal the original JSON', async () => {
    await fc.assert(
      fc.asyncProperty(jsonChunksArb, async ({ value, chunks }) => {
        // Encode each chunk as a delta SSE event
        const events = chunks.map((chunk) => ({ name: 'delta', data: { text: chunk } }))
        const encoded = encodeEvents(events)
        const response = mockResponse(encoded)

        // Accumulate the text fields from delta events
        let accumulated = ''
        for await (const event of readSSEStream(response)) {
          if (event.name === 'delta') {
            accumulated += (event.data as { text: string }).text
          }
        }

        // The accumulated string must be valid JSON equal to the original value
        expect(JSON.parse(accumulated)).toEqual(value)
      }),
      { numRuns: 300 },
    )
  })
})
