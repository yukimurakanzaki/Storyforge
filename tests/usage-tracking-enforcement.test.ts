/**
 * Bug Condition Exploration Test — Usage Tracking Enforcement
 *
 * Property 1: Bug Condition — Usage Enforcement Not Wired Into Analyze Route
 *
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code or the test.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest } from 'next/server'

// ─── Supabase mock setup ────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockServiceClient = vi.fn()

// mockUpdate must support chaining: .update({...}).eq('user_id', id)
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

// Configurable per-test state
let mockUsageCount = 0
let mockPlan: 'free' | 'pro' = 'free'
let mockUsageRowExists = true

function buildSupabaseMock() {
  const __svcClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plan: mockPlan },
            error: null,
          }),
        }
      }
      if (table === 'usage_counters') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockUsageRowExists
              ? { count: mockUsageCount, reset_at: null, first_analysis_at: null }
              : null,
            error: null,
          }),
          update: mockUpdate,
          upsert: mockUpsert,
          insert: mockInsert,
        }
      }
      if (table === 'analysis_events') {
        return {
          insert: mockInsert,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockInsert,
        update: mockUpdate,
        upsert: mockUpsert,
      }
    }),
  }

  mockServiceClient.mockReturnValue(__svcClient)
  return __svcClient
}

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockServiceClient,
}))

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

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: vi.fn().mockImplementation(() => makeStreamFromText(VALID_JSON_TEXT)),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAuthenticatedRequest(text = 'Sample BRD text for analysis') {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authenticated path
    },
    body: JSON.stringify({ text }),
  })
}

async function getPostHandler() {
  // Re-import fresh each time so mocks are applied
  const { POST } = await import('@/app/api/analyze/route')
  return POST
}

/**
 * Drain an SSE ReadableStream to let the background IIFE complete.
 * Returns the list of event names emitted.
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Usage Enforcement Not Wired Into Analyze Route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    mockUsageCount = 0
    mockPlan = 'free'
    mockUsageRowExists = true

    // Re-wire mockUpdate chain after clearAllMocks resets return values
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)
  })

  // ─── Test 4: FREE_TIER_LIMIT constant ──────────────────────────────────────
  it('Test 4: FREE_TIER_LIMIT should equal 3 (PRD-specified value)', async () => {
    /**
     * Bug Condition: FREE_TIER_LIMIT != 3
     * Expected: FREE_TIER_LIMIT === 3
     * On unfixed code: FREE_TIER_LIMIT === 5 → FAILS
     */
    const { FREE_TIER_LIMIT } = await import('@/lib/constants')
    expect(FREE_TIER_LIMIT).toBe(3)
  })

  // ─── Test 1: Free-tier limit enforcement (429 when count >= 3) ─────────────
  it('Test 1 (PBT): free-tier users at or above limit always get 429 with X-Limit-Reached header', async () => {
    /**
     * Bug Condition: usageCheckNotCalled
     * Expected: 429 + X-Limit-Reached: true when count >= FREE_TIER_LIMIT
     * On unfixed code: returns 200 (no check) → FAILS
     *
     * Validates: Requirements 1.1, 1.5
     */
    const { createClient } = await import('@/lib/supabase/server')

    await fc.assert(
      fc.asyncProperty(
        // Generate free-tier users with usage count at or above the limit (3–10)
        fc.record({
          count: fc.integer({ min: 3, max: 10 }),
          plan: fc.constant('free' as const),
        }),
        async ({ count, plan }) => {
          vi.resetModules()
          mockUsageCount = count
          mockPlan = plan
          mockUsageRowExists = true

          vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

          const POST = await getPostHandler()
          const req = makeAuthenticatedRequest()
          const response = await POST(req)

          // Must return 429 — not 200
          expect(response.status).toBe(429)
          // Must include X-Limit-Reached: true header
          expect(response.headers.get('X-Limit-Reached')).toBe('true')
        }
      ),
      { numRuns: 5 }
    )
  })

  // ─── Test 2: usage_counters is incremented on success ─────────────────────
  it('Test 2: successful authenticated request increments usage_counters', async () => {
    /**
     * Bug Condition: usageIncrementNotCalled
     * Expected: Supabase update/upsert called on usage_counters after success
     * On unfixed code: no update/upsert called → FAILS
     *
     * Validates: Requirements 1.2
     */
    mockUsageCount = 0
    mockPlan = 'free'
    mockUsageRowExists = true

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const req = makeAuthenticatedRequest()
    const response = await POST(req)

    // Request should return SSE stream (user is under limit)
    expect(response.status).toBe(200)

    // Drain the stream to let the background IIFE complete
    const events = await drainSSEStream(response)
    expect(events).toContain('done')

    // usage_counters must have been updated or upserted
    // Check that either update or upsert was called at all
    const totalMutationCalls = mockUpdate.mock.calls.length + mockUpsert.mock.calls.length
    expect(totalMutationCalls).toBeGreaterThan(0)
  })

  // ─── Test 3: analysis_events receives started + completed rows ─────────────
  it('Test 3: authenticated request logs analysis_started and analysis_completed events', async () => {
    /**
     * Bug Condition: analysisEventNotLogged
     * Expected: analysis_events.insert called twice (started + completed)
     * On unfixed code: insert never called → FAILS
     *
     * Validates: Requirements 1.3
     */
    mockUsageCount = 0
    mockPlan = 'free'
    mockUsageRowExists = true

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const req = makeAuthenticatedRequest()
    const response = await POST(req)

    expect(response.status).toBe(200)

    // Drain the stream to let the background IIFE complete
    const events = await drainSSEStream(response)
    expect(events).toContain('done')

    // analysis_events.insert must have been called at least twice
    // (once for analysis_started, once for analysis_completed)
    const insertCalls = mockInsert.mock.calls
    const analysisEventInserts = insertCalls.filter((call) => {
      const arg = call[0]
      return (
        arg &&
        typeof arg === 'object' &&
        'event_type' in arg &&
        (arg.event_type === 'analysis_started' || arg.event_type === 'analysis_completed')
      )
    })

    expect(analysisEventInserts.length).toBeGreaterThanOrEqual(2)

    const eventTypes = analysisEventInserts.map((call) => call[0].event_type)
    expect(eventTypes).toContain('analysis_started')
    expect(eventTypes).toContain('analysis_completed')
  })

  // ─── Test 5: First-time user — no existing usage_counters row ──────────────
  it('Test 5: first-time user with no usage_counters row gets row created via upsert', async () => {
    /**
     * Bug Condition: incrementUsage does UPDATE on non-existent row → count stays 0
     * Expected: upsert creates row with count=1 for first-time users
     * On unfixed code: no upsert/insert called → FAILS
     *
     * Validates: Requirements 1.2 (first-time user handling)
     */
    mockUsageCount = 0
    mockPlan = 'free'
    mockUsageRowExists = false // No existing row

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const req = makeAuthenticatedRequest()
    const response = await POST(req)

    expect(response.status).toBe(200)

    // Drain the stream to let the background IIFE complete
    const events = await drainSSEStream(response)
    expect(events).toContain('done')

    // For a first-time user, upsert (or insert) must be called to create the row
    // A plain UPDATE on a non-existent row silently does nothing — that's the bug
    const upsertOrInsertCalled =
      mockUpsert.mock.calls.length > 0 || mockInsert.mock.calls.length > 0

    expect(upsertOrInsertCalled).toBe(true)
  })
})
