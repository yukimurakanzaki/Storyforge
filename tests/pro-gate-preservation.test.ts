/**
 * Preservation Property Tests — Pro Gate: Company Context
 *
 * Property 2: Preservation — Non-Buggy Request Behavior
 *
 * These tests MUST PASS on UNFIXED code.
 * They capture baseline behavior that must be preserved after the fix.
 *
 * Observation-first methodology:
 * - validateAnalyzePayload({ text: "valid" }) → { valid: true, text: "valid" }
 *   (no projectId field on unfixed code — that's the current contract)
 * - validateAnalyzePayload({ text: "valid", projectId: null }) → { valid: true, text: "valid" }
 *   (projectId is silently ignored on unfixed code)
 * - Guest user with valid text → SSE stream with event: done
 * - Free user with projectId: null → SSE stream with event: done (same as no projectId)
 * - Free user at usage limit → 429 regardless of projectId
 * - Unauthenticated non-guest → 401
 *
 * EXPECTED OUTCOME: ALL tests PASS on unfixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest } from 'next/server'

// ─── Supabase mock helpers ────────────────────────────────────────────────────

const mockUsageInsert = vi.fn().mockResolvedValue({ error: null })
const mockUsageUpdate = vi.fn().mockResolvedValue({ error: null })
const mockUsageUpsert = vi.fn().mockResolvedValue({ error: null })
const mockEventInsert = vi.fn().mockResolvedValue({ error: null })

function buildSupabaseMock(options: {
  authenticated: boolean
  plan?: 'free' | 'pro'
  usageCount?: number
  usageLimit?: number
}) {
  const { authenticated, plan = 'free', usageCount = 0 } = options

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
          single: vi.fn().mockResolvedValue({ data: { plan }, error: null }),
        }
      }
      if (table === 'usage_counters') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { count: usageCount, reset_at: null, first_analysis_at: null },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          upsert: mockUsageUpsert,
          insert: mockUsageInsert,
        }
      }
      if (table === 'analysis_events') {
        return { insert: mockEventInsert }
      }
      // projects table — should NOT be queried on unfixed code for any preservation path
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockUsageInsert,
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        upsert: mockUsageUpsert,
      }
    }),
  }
}

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

function makeStreamFromText(text: string) {
  let done = false
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (!done) {
            done = true
            return {
              value: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
              done: false,
            }
          }
          return { value: undefined, done: true }
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

// Mock Google AI SDK and Vercel AI SDK (used for free tier)
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-google-model'),
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockImplementation(() => ({
    textStream: (async function* () {
      yield VALID_JSON_TEXT
    })(),
  })),
  generateText: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  body?: unknown
  rawBody?: string
}): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const body =
    options.rawBody !== undefined ? options.rawBody : JSON.stringify(options.body)
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

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Preservation — Pro Gate: Company Context (Non-Buggy Request Behavior)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    mockAnthropicStream.mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT))
    mockEventInsert.mockResolvedValue({ error: null })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ authenticated: true }) as never
    )
  })

  // ─── Concrete baseline observations ───────────────────────────────────────

  it('Baseline 1: validateAnalyzePayload({ text: "valid BRD" }) returns { valid: true, text: "valid BRD" }', async () => {
    /**
     * Observation: on unfixed code, validateAnalyzePayload with no projectId
     * returns { valid: true, text } — the current contract. This must be preserved.
     *
     * Validates: Requirements 3.4
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: 'valid BRD' })

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.text).toBe('valid BRD')
    }
  })

  it('Baseline 2: validateAnalyzePayload({ text: "" }) returns { valid: false, error: "Missing text", status: 400 }', async () => {
    /**
     * Observation: empty text is rejected with 400. Must be preserved.
     *
     * Validates: Requirements 3.4
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: '' })

    expect(result).toEqual({ valid: false, error: 'Missing text', status: 400 })
  })

  it('Baseline 3: validateAnalyzePayload with text > 150,000 chars returns { valid: false, error: "BRD text too large", status: 413 }', async () => {
    /**
     * Observation: oversized text is rejected with 413. Must be preserved.
     *
     * Validates: Requirements 3.4
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: 'x'.repeat(150_001) })

    expect(result).toEqual({ valid: false, error: 'BRD text too large', status: 413 })
  })

  it('Baseline 4: unauthenticated user → returns 401 Unauthorized', async () => {
    /**
     * Observation: unauthenticated requests return 401 Unauthorized.
     *
     * Validates: Requirements 4.1
     */
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ authenticated: false }) as never
    )

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'valid BRD text' } })
    const response = await POST(req)

    expect(response.status).toBe(401)
  })

  it('Baseline 5: free user with projectId: null → SSE stream returns event: done (same as no projectId)', async () => {
    /**
     * Observation: free user with projectId: null proceeds normally — the
     * null projectId is ignored and analysis completes. Must be preserved.
     *
     * Validates: Requirements 3.3
     */
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ authenticated: true, plan: 'free' }) as never
    )

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'valid BRD text', projectId: null } })
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const events = await drainSSEStream(response)
    expect(events).toContain('done')
  })

  it('Baseline 6: free user at usage limit → 429 regardless of projectId', async () => {
    /**
     * Observation: usage limit enforcement fires before any project context
     * logic. A free user at limit gets 429 regardless of projectId value.
     *
     * Validates: Requirements 3.5
     */
    const { createClient } = await import('@/lib/supabase/server')
    // FREE_TIER_LIMIT is 3 per constants.ts — set count to 3 to trigger limit
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ authenticated: true, plan: 'free', usageCount: 3 }) as never
    )

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'valid BRD text', projectId: 'some-uuid' } })
    const response = await POST(req)

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toBe('Limit reached')
  })

  it('Baseline 7: unauthenticated non-guest → 401 JSON response', async () => {
    /**
     * Observation: non-guest requests without a valid session return 401.
     * Must be preserved.
     *
     * Validates: Requirements 3.4
     */
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ authenticated: false }) as never
    )

    const POST = await getPostHandler()
    const req = makeRequest({ body: { text: 'valid BRD text' } })
    const response = await POST(req)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  // ─── PBT: validateAnalyzePayload never throws for any projectId value ──────

  it('PBT: validateAnalyzePayload with valid text and any projectId value never throws and returns valid: true', async () => {
    /**
     * Property: for any valid text string (1–1000 chars) with any projectId
     * value (string, null, undefined, number, object), validateAnalyzePayload
     * never throws and always returns { valid: true, text }.
     *
     * On unfixed code: projectId is silently ignored — the function always
     * returns { valid: true, text } without throwing. This must be preserved.
     *
     * Validates: Requirements 3.4
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    // Arbitrary for any projectId value
    const projectIdArb = fc.oneof(
      // Valid UUID-like strings
      fc.uuid(),
      // Empty string
      fc.constant(''),
      // Whitespace-only string
      fc.constant('   '),
      // Arbitrary strings
      fc.string({ minLength: 0, maxLength: 100 }),
      // null
      fc.constant(null),
      // undefined
      fc.constant(undefined),
      // Numbers
      fc.integer(),
      fc.float(),
      // Boolean
      fc.boolean(),
      // Object
      fc.record({ id: fc.string() }),
    )

    fc.assert(
      fc.property(
        // Valid text: 1–1000 chars, non-empty after trim
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        projectIdArb,
        (text, projectId) => {
          let result: ReturnType<typeof validateAnalyzePayload>

          // Must never throw
          expect(() => {
            result = validateAnalyzePayload({ text, projectId })
          }).not.toThrow()

          // Must return valid: true with the original text
          expect(result!.valid).toBe(true)
          if (result!.valid) {
            expect(result!.text).toBe(text)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('PBT: validateAnalyzePayload with valid text and projectId: null always returns { valid: true, text }', async () => {
    /**
     * Property: for any valid text string (1–1000 chars) with projectId: null,
     * validateAnalyzePayload always returns { valid: true, text } without throwing.
     *
     * This is the specific free-tier preservation case: null projectId must
     * never affect text validation.
     *
     * Validates: Requirements 3.3, 3.4
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        (text) => {
          const result = validateAnalyzePayload({ text, projectId: null })

          expect(result.valid).toBe(true)
          if (result.valid) {
            expect(result.text).toBe(text)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // ─── PBT: unauthenticated requests always return 401 ─

  it('PBT: unauthenticated requests with valid text always return 401', async () => {
    /**
     * Property: for any valid text string (1–1000 chars), an unauthenticated request
     * returns 401 Unauthorized.
     *
     * Validates: Requirements 4.1
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        async (text) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT))

          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock({ authenticated: false }) as never
          )

          const POST = await getPostHandler()
          const req = makeRequest({ body: { text } })
          const response = await POST(req)

          expect(response.status).toBe(401)
        }
      ),
      { numRuns: 10 }
    )
  })

  it('PBT: free user with projectId: null and valid text always returns SSE stream with event: done', async () => {
    /**
     * Property: for any valid text string (1–1000 chars), a free-tier
     * authenticated user with projectId: null always gets a successful
     * SSE stream (event: done). The null projectId must not affect behavior.
     *
     * Validates: Requirements 3.3
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        async (text) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT))

          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock({ authenticated: true, plan: 'free', usageCount: 0 }) as never
          )

          const POST = await getPostHandler()
          const req = makeRequest({ body: { text, projectId: null } })
          const response = await POST(req)

          expect(response.status).toBe(200)
          const events = await drainSSEStream(response)
          expect(events).toContain('done')
        }
      ),
      { numRuns: 10 }
    )
  })

  // ─── PBT: usage limit enforcement fires regardless of projectId ────────────

  it('PBT: free user at usage limit always returns 429 regardless of projectId value', async () => {
    /**
     * Property: for any projectId value (string, null, undefined), a free-tier
     * user at their usage limit always gets 429. The projectId must not bypass
     * or affect usage enforcement.
     *
     * Validates: Requirements 3.5
     */
    const { createClient } = await import('@/lib/supabase/server')

    const projectIdArb = fc.oneof(
      fc.uuid(),
      fc.constant(null),
      fc.constant(undefined),
      fc.string({ minLength: 1, maxLength: 50 }),
    )

    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        async (projectId) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT))

          // FREE_TIER_LIMIT is 3 — set count to 3 to trigger limit
          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock({ authenticated: true, plan: 'free', usageCount: 3 }) as never
          )

          const POST = await getPostHandler()
          const body: Record<string, unknown> = { text: 'valid BRD text' }
          if (projectId !== undefined) body.projectId = projectId

          const req = makeRequest({ body })
          const response = await POST(req)

          expect(response.status).toBe(429)
          const responseBody = await response.json()
          expect(responseBody.error).toBe('Limit reached')
        }
      ),
      { numRuns: 10 }
    )
  })

  // ─── PBT: unauthenticated non-guest always returns 401 ────────────────────

  it('PBT: unauthenticated non-guest requests always return 401 regardless of body content', async () => {
    /**
     * Property: for any request body, a non-guest request without a valid
     * session always returns 401. Auth check fires before payload parsing.
     *
     * Validates: Requirements 3.4
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({ text: fc.string({ minLength: 1, maxLength: 500 }) }),
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 500 }),
            projectId: fc.uuid(),
          }),
          fc.constant({ text: '' }),
          fc.constant({}),
        ),
        async (payload) => {
          vi.resetModules()
          vi.clearAllMocks()
          mockAnthropicStream.mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT))

          vi.mocked(createClient).mockResolvedValue(
            buildSupabaseMock({ authenticated: false }) as never
          )

          const POST = await getPostHandler()
          const req = makeRequest({ body: payload })
          const response = await POST(req)

          expect(response.status).toBe(401)
          const body = await response.json()
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 8 }
    )
  })
})
