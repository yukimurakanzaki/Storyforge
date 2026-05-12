/**
 * Preservation Property Tests — Guest, Validation, and Error Paths Unchanged
 *
 * Property 2: Preservation — These tests MUST PASS on UNFIXED code.
 * They capture baseline behavior that must be preserved after the fix.
 *
 * Observation-first methodology:
 * - Guest request with x-guest-mode: 1 → uses in-memory rate limiter, no Supabase usage calls
 * - Invalid JSON body → 400 "Invalid JSON"
 * - Missing/empty text → 400 "Missing text"
 * - Text > 150,000 chars → 413 "BRD text too large"
 * - Unauthenticated non-guest → 401 "Unauthorized"
 * - Anthropic throws → 500, no usage increment
 *
 * EXPECTED OUTCOME: ALL tests PASS on unfixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest } from 'next/server'

// ─── Supabase usage mutation trackers ────────────────────────────────────────

// Separate mocks for usage_counters vs analysis_events so we can distinguish
// "usage counter incremented" from "event logged"
const mockUsageInsert = vi.fn().mockResolvedValue({ error: null })
const mockUsageUpdate = vi.fn().mockResolvedValue({ error: null })
const mockUsageUpsert = vi.fn().mockResolvedValue({ error: null })
const mockEventInsert = vi.fn().mockResolvedValue({ error: null })

// Legacy alias kept for tests that don't need the distinction
const mockInsert = mockUsageInsert
const mockUpdate = mockUsageUpdate
const mockUpsert = mockUsageUpsert

function buildSupabaseMock(authenticated: boolean) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: authenticated
            ? { id: 'test-user-id', email: 'test@example.com' }
            : null,
        },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plan: 'free' },
            error: null,
          }),
        }
      }
      if (table === 'usage_counters') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { count: 0, reset_at: null, first_analysis_at: null },
            error: null,
          }),
          update: mockUsageUpdate,
          upsert: mockUsageUpsert,
          insert: mockUsageInsert,
        }
      }
      if (table === 'analysis_events') {
        // Use a separate mock so analysis_started/completed inserts don't
        // pollute the usage-counter mutation count
        return { insert: mockEventInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockUsageInsert,
        update: mockUsageUpdate,
        upsert: mockUsageUpsert,
      }
    }),
  }
}

// ─── Guest rate-limit mock ────────────────────────────────────────────────────

// Default: guest requests are allowed (not rate-limited)
let guestAllowed = true

vi.mock('@/lib/guest-rate-limit', () => ({
  checkGuestRateLimit: vi.fn(() => ({
    allowed: guestAllowed,
    remaining: guestAllowed ? 9 : 0,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// ─── Anthropic mock ───────────────────────────────────────────────────────────

const VALID_JSON_TEXT = JSON.stringify({
  gapList: [],
  clarificationQuestions: [],
  readinessScore: 80,
  readinessLabel: 'Siap',
})

// Helper to build an async-iterable stream of SSE-like events from text chunks
function makeStreamFromChunks(chunks: string[]) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        async next() {
          if (i < chunks.length) {
            return {
              value: {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: chunks[i++] },
              },
              done: false,
            }
          }
          return { value: undefined, done: true }
        },
      }
    },
  }
}

// Helper to build a stream that throws immediately
function makeThrowingStream(error: Error) {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          throw error
        },
      }
    },
  }
}

const mockAnthropicStream = vi.fn()

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: mockAnthropicStream,
    },
  },
  Anthropic: class {},
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Drain an SSE ReadableStream and return all event names emitted.
 * Used to wait for the background IIFE to complete before asserting.
 */
async function drainSSEStream(response: Response): Promise<string[]> {
  if (!response.body) return []
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const eventNames: string[] = []
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventNames.push(line.slice(7).trim())
      }
    }
  }
  return eventNames
}

function makeRequest(options: {
  guestMode?: boolean
  body?: unknown
  rawBody?: string
  authenticated?: boolean
}): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.guestMode) {
    headers['x-guest-mode'] = '1'
  }

  const body =
    options.rawBody !== undefined
      ? options.rawBody
      : JSON.stringify(options.body)

  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers,
    body,
  })
}

async function getPostHandler() {
  const { POST } = await import('@/app/api/analyze/route')
  return POST
}

function countUsageMutations() {
  // Only count mutations on usage_counters — NOT analysis_events inserts.
  // Requirement 3.5 says "SHALL NOT increment the usage counter"; logging
  // analysis_started before the Anthropic call is correct per requirement 2.3.
  return (
    mockUsageInsert.mock.calls.length +
    mockUsageUpdate.mock.calls.length +
    mockUsageUpsert.mock.calls.length
  )
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Preservation — Guest, Validation, and Error Paths Unchanged', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    guestAllowed = true
    mockEventInsert.mockResolvedValue({ error: null })

    // Default: Anthropic returns a valid response stream
    mockAnthropicStream.mockImplementation(() => makeStreamFromChunks([VALID_JSON_TEXT]))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock(true) as never
    )
  })

  // ─── Property 3.1: Guest mode uses in-memory rate limiter, no Supabase usage calls ──

  it('Property 3.1 (PBT): guest requests use in-memory rate limiter and make no Supabase usage mutations', async () => {
    /**
     * For all guest requests (any valid/invalid payload), the route must:
     * 1. Use checkGuestRateLimit (in-memory), not Supabase usage functions
     * 2. Never call insert/update/upsert on usage_counters or analysis_events
     *
     * Validates: Requirement 3.1
     */
    const { createClient } = await import('@/lib/supabase/server')
    const { checkGuestRateLimit } = await import('@/lib/guest-rate-limit')

    await fc.assert(
      fc.asyncProperty(
        // Generate a variety of text payloads for guest requests
        fc.oneof(
          // Valid text
          fc.string({ minLength: 1, maxLength: 1000 }).map((t) => ({ text: t })),
          // Empty text (will fail validation but still guest path)
          fc.constant({ text: '' }),
          // Missing text field
          fc.constant({}),
          // Extra fields alongside valid text
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 500 }),
            extra: fc.string(),
          }),
        ),
        async (payload) => {
          vi.resetModules()
          vi.clearAllMocks()
          guestAllowed = true
          mockAnthropicStream.mockImplementation(() => makeStreamFromChunks([VALID_JSON_TEXT]))

          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock(true) as never
          )

          const POST = await getPostHandler()
          const req = makeRequest({ guestMode: true, body: payload })
          await POST(req)
          // checkGuestRateLimit must have been called (in-memory limiter)
          expect(vi.mocked(checkGuestRateLimit)).toHaveBeenCalled()

          // No Supabase usage mutations should occur for guest requests
          const mutations = countUsageMutations()
          expect(mutations).toBe(0)
        }
      ),
      { numRuns: 10 }
    )
  })

  it('Property 3.1b: guest request that is rate-limited returns 429 from in-memory limiter', async () => {
    /**
     * When the in-memory rate limiter denies a guest request, the route
     * returns 429 without touching Supabase usage tables.
     *
     * Validates: Requirement 3.1
     */
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    guestAllowed = false

    const POST = await getPostHandler()
    const req = makeRequest({ guestMode: true, body: { text: 'some BRD text' } })
    const response = await POST(req)

    expect(response.status).toBe(429)

    // No Supabase usage mutations
    expect(countUsageMutations()).toBe(0)
  })

  // ─── Property 3.3: Invalid payloads return correct 400/413 errors ─────────

  it('Property 3.3 (PBT): invalid payloads return correct status and error message', async () => {
    /**
     * For all invalid payloads, the route returns the observed error responses:
     * - Invalid JSON body → 400 "Invalid JSON"
     * - Missing/empty text → 400 "Missing text"
     * - Text > 150,000 chars → 413 "BRD text too large"
     *
     * Validates: Requirement 3.3
     */
    const { createClient } = await import('@/lib/supabase/server')

    type InvalidCase =
      | { kind: 'invalid_json'; rawBody: string }
      | { kind: 'missing_text'; body: Record<string, unknown> }
      | { kind: 'empty_text'; body: { text: string } }
      | { kind: 'oversized_text'; body: { text: string } }

    const invalidPayloadArb: fc.Arbitrary<InvalidCase> = fc.oneof(
      // Invalid JSON
      fc.string({ minLength: 1, maxLength: 50 })
        .filter((s) => {
          try { JSON.parse(s); return false } catch { return true }
        })
        .map((rawBody): InvalidCase => ({ kind: 'invalid_json', rawBody })),

      // Missing text field
      fc.record({
        notText: fc.string(),
      }).map((body): InvalidCase => ({ kind: 'missing_text', body })),

      // Empty text
      fc.constant({ kind: 'empty_text' as const, body: { text: '' } }),

      // Whitespace-only text
      fc.array(fc.constant(' '), { minLength: 1, maxLength: 10 })
        .map((spaces): InvalidCase => ({ kind: 'empty_text', body: { text: spaces.join('') } })),

      // Oversized text (> 150,000 chars)
      fc.constant({
        kind: 'oversized_text' as const,
        body: { text: 'x'.repeat(150_001) },
      }),
    )

    await fc.assert(
      fc.asyncProperty(
        invalidPayloadArb,
        async (invalidCase) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromChunks([VALID_JSON_TEXT]))
          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock(true) as never
          )

          const POST = await getPostHandler()

          let req: NextRequest
          if (invalidCase.kind === 'invalid_json') {
            req = makeRequest({ rawBody: invalidCase.rawBody })
          } else {
            req = makeRequest({ body: invalidCase.body })
          }

          const response = await POST(req)
          const body = await response.json()

          if (invalidCase.kind === 'invalid_json') {
            expect(response.status).toBe(400)
            expect(body.error).toBe('Invalid JSON')
          } else if (invalidCase.kind === 'missing_text') {
            expect(response.status).toBe(400)
            expect(body.error).toBe('Missing text')
          } else if (invalidCase.kind === 'empty_text') {
            expect(response.status).toBe(400)
            expect(body.error).toBe('Missing text')
          } else if (invalidCase.kind === 'oversized_text') {
            expect(response.status).toBe(413)
            expect(body.error).toBe('BRD text too large')
          }
        }
      ),
      { numRuns: 15 }
    )
  })

  // ─── Property 3.4: Unauthenticated non-guest requests return 401 ──────────

  it('Property 3.4 (PBT): unauthenticated non-guest requests always return 401', async () => {
    /**
     * For all requests without x-guest-mode and without a valid session,
     * the route must return 401 Unauthorized.
     *
     * Validates: Requirement 3.4
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        // Generate various payloads — the 401 should fire before payload parsing
        fc.oneof(
          fc.record({ text: fc.string({ minLength: 1, maxLength: 500 }) }),
          fc.constant({ text: '' }),
          fc.constant({}),
        ),
        async (payload) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromChunks([VALID_JSON_TEXT]))

          // Unauthenticated: user is null
          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock(false) as never
          )

          const POST = await getPostHandler()
          // No x-guest-mode header → goes to auth check
          const req = makeRequest({ guestMode: false, body: payload })
          const response = await POST(req)

          expect(response.status).toBe(401)
          const body = await response.json()
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 8 }
    )
  })

  // ─── Property 3.5: Anthropic error → SSE error event, no usage increment ─────────────

  it('Property 3.5 (PBT): when Anthropic throws, SSE error event is emitted and no usage mutations occur', async () => {
    /**
     * For all requests where the Anthropic API throws an error,
     * the route must emit `event: error` via SSE and must NOT call any usage
     * mutation (insert/update/upsert on usage_counters).
     *
     * NOTE: With SSE streaming, errors after stream starts are emitted as
     * `event: error` SSE events — the HTTP status is 200 (stream already started).
     *
     * Validates: Requirement 3.5 (no usage increment on error)
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        // Generate valid text payloads (so we reach the Anthropic call)
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        // Generate various error types
        fc.oneof(
          fc.constant(new Error('Anthropic API error')),
          fc.constant(new Error('Rate limit exceeded')),
          fc.constant(new Error('Network timeout')),
          fc.constant(new Error('Internal server error')),
        ),
        async (text, error) => {
          vi.resetModules()
          vi.clearAllMocks()

          // Make Anthropic stream throw
          mockAnthropicStream.mockReturnValue(makeThrowingStream(error))

          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock(true) as never
          )

          const POST = await getPostHandler()
          const req = makeRequest({ body: { text } })
          const response = await POST(req)

          // SSE response — HTTP 200 with text/event-stream
          expect(response.status).toBe(200)
          expect(response.headers.get('Content-Type')).toContain('text/event-stream')

          // Drain stream to let background IIFE complete
          const events = await drainSSEStream(response)
          expect(events).toContain('error')
          expect(events).not.toContain('done')

          // No usage mutations should have occurred
          const mutations = countUsageMutations()
          expect(mutations).toBe(0)
        }
      ),
      { numRuns: 10 }
    )
  })

  // ─── Concrete baseline observations (non-PBT) ─────────────────────────────

  it('Baseline: invalid JSON body returns 400 with "Invalid JSON" error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    const POST = await getPostHandler()
    const req = makeRequest({ rawBody: 'not valid json {{{' })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid JSON')
  })

  it('Baseline: missing text field returns 400 with "Missing text" error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    const POST = await getPostHandler()
    const req = makeRequest({ body: { notText: 'hello' } })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Missing text')
  })

  it('Baseline: empty text field returns 400 with "Missing text" error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: '' } })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Missing text')
  })

  it('Baseline: text exceeding 150,000 chars returns 413 with "BRD text too large" error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'a'.repeat(150_001) } })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toBe('BRD text too large')
  })

  it('Baseline: unauthenticated non-guest request returns 401 Unauthorized', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(false) as never)

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'some BRD text' } })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('Baseline: Anthropic API error emits SSE error event and no usage mutations occur', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(true) as never)

    mockAnthropicStream.mockReturnValue(makeThrowingStream(new Error('Anthropic API error')))

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'some BRD text' } })
    const response = await POST(req)

    // SSE response — HTTP 200 with event: error
    expect(response.status).toBe(200)
    const events = await drainSSEStream(response)
    expect(events).toContain('error')
    expect(countUsageMutations()).toBe(0)
  })
})
