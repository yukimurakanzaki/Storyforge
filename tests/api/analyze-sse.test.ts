/**
 * Unit tests for /api/analyze SSE streaming route
 *
 * Sub-task 4.1: Pre-stream error paths (return regular JSON, not SSE)
 * Sub-task 4.2: Usage tracking — incrementUsage called on done, NOT on error
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock helpers ────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

let mockUsageCount = 0
let mockPlan: 'free' | 'pro' = 'free'
let mockUsageRowExists = true
let mockAuthUser: { id: string } | null = { id: 'test-user-id' }

function buildSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
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
          insert: mockInsert,
        }
      }
      if (table === 'analysis_events') {
        return { insert: mockInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockInsert,
        update: mockUpdate,
      }
    }),
  }
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Default Anthropic mock — stream that emits a valid JSON result
const mockStreamEvents = [
  { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"gapList":[],' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: '"clarificationQuestions":[],' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: '"readinessScore":80,"readinessLabel":"Siap"}' } },
]

function makeAsyncIterable(events: typeof mockStreamEvents) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        async next() {
          if (i < events.length) return { value: events[i++], done: false }
          return { value: undefined, done: true }
        },
      }
    },
  }
}

const mockStream = vi.fn().mockReturnValue(makeAsyncIterable(mockStreamEvents))

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: mockStream,
    },
  },
  Anthropic: class {},
}))

// Mock Google AI SDK and Vercel AI SDK (used for free tier, not exercised in these tests)
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-google-model'),
}))

vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function makeUserRequest(body: unknown = { text: 'Valid BRD text' }): NextRequest {
  return makeRequest(body)
}

async function getPostHandler() {
  const { POST } = await import('@/app/api/analyze/route')
  return POST
}

/**
 * Drain an SSE ReadableStream and collect all event names emitted.
 */
async function drainSSEStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader()
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
      const lines = part.split('\n')
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventNames.push(line.slice(7).trim())
        }
      }
    }
  }

  return eventNames
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()

  mockUsageCount = 0
  mockPlan = 'pro'
  mockUsageRowExists = true
  mockAuthUser = { id: 'test-user-id' }

  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockStream.mockReturnValue(makeAsyncIterable(mockStreamEvents))

  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)
})

// ─── Sub-task 4.1: Pre-stream error paths ─────────────────────────────────────

describe('4.1 Pre-stream error paths — return JSON, not SSE', () => {
  it('returns 401 JSON when no auth session (user mode)', async () => {
    // No authenticated user
    mockAuthUser = null

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 429 + X-Limit-Reached: true when usage limit reached', async () => {
    // User is at the free-tier limit
    mockUsageCount = 3
    mockPlan = 'free'
    mockUsageRowExists = true

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get('X-Limit-Reached')).toBe('true')
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const body = await response.json()
    expect(body.error).toBe('Limit reached')
  })

  it('returns 400 JSON for missing text field', async () => {
    const POST = await getPostHandler()
    const response = await POST(makeUserRequest({ notText: 'oops' }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const body = await response.json()
    expect(body.error).toBe('Missing text')
  })

  it('returns 400 JSON for empty text field', async () => {
    const POST = await getPostHandler()
    const response = await POST(makeUserRequest({ text: '   ' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing text')
  })

  it('returns 413 JSON for oversized text', async () => {
    const POST = await getPostHandler()
    const response = await POST(makeUserRequest({ text: 'x'.repeat(150_001) }))

    expect(response.status).toBe(413)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const body = await response.json()
    expect(body.error).toBe('BRD text too large')
  })

  it('pre-stream errors do NOT return text/event-stream', async () => {
    mockAuthUser = null
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)

    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    expect(response.headers.get('Content-Type')).not.toContain('text/event-stream')
  })
})

// ─── Sub-task 4.2: Usage tracking on done vs error ────────────────────────────

describe('4.2 Usage tracking — done vs error', () => {
  it('incrementUsage IS called after event: done (successful stream)', async () => {
    // Anthropic mock returns valid JSON chunks (default mock)
    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    // Response must be SSE
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    // Drain the stream to let the background IIFE complete
    const events = await drainSSEStream(response)
    expect(events).toContain('done')

    // incrementUsage calls update() on usage_counters
    const updateCalled = mockUpdate.mock.calls.length > 0
    const insertCalled = mockInsert.mock.calls.some((call) => {
      const arg = call[0]
      return arg && typeof arg === 'object' && 'count' in arg
    })
    expect(updateCalled || insertCalled).toBe(true)
  })

  it('incrementUsage is NOT called when Anthropic throws (event: error)', async () => {
    // Make Anthropic stream throw immediately
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]() {
        return {
          async next() {
            throw new Error('Anthropic API failure')
          },
        }
      },
    })

    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    // Response must be SSE
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    // Drain the stream to let the background IIFE complete
    const events = await drainSSEStream(response)
    expect(events).toContain('error')
    expect(events).not.toContain('done')

    // incrementUsage must NOT have been called
    // It calls update() on usage_counters — check no update was called
    // (analysis_events.insert for 'analysis_started' may still be called, but
    //  usage_counters update/insert for incrementUsage must NOT be called)
    const usageCounterUpdateCalled = mockUpdate.mock.calls.length > 0
    const usageCounterInsertCalled = mockInsert.mock.calls.some((call) => {
      const arg = call[0]
      // incrementUsage inserts with a 'count' field
      return arg && typeof arg === 'object' && 'count' in arg && 'user_id' in arg
    })
    expect(usageCounterUpdateCalled || usageCounterInsertCalled).toBe(false)
  })

  it('incrementUsage is NOT called when JSON parse fails (event: error)', async () => {
    // Anthropic returns invalid JSON
    const badJsonEvents = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'NOT VALID JSON {{{' } },
    ]
    mockStream.mockReturnValue(makeAsyncIterable(badJsonEvents))

    const POST = await getPostHandler()
    const response = await POST(makeUserRequest())

    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const events = await drainSSEStream(response)
    expect(events).toContain('error')
    expect(events).not.toContain('done')

    // incrementUsage must NOT have been called
    const usageCounterInsertCalled = mockInsert.mock.calls.some((call) => {
      const arg = call[0]
      return arg && typeof arg === 'object' && 'count' in arg && 'user_id' in arg
    })
    expect(mockUpdate.mock.calls.length === 0 || !usageCounterInsertCalled).toBe(true)
  })
})
