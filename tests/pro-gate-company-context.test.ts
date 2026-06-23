/**
 * Bug Condition Exploration Test — Pro Gate: Company Context
 *
 * Property 1: Bug Condition — Free User Context Leak
 *
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code or the test.
 *
 * Root causes being tested:
 *   #1 — No subscriptions.plan query in POST /api/analyze for project context
 *   #2 — Client unconditionally appends project context JSON to `text`
 *   #3 — validateAnalyzePayload does not accept or return `projectId`
 *   #4 — handleProjectSelect advances free users to 'input' phase without paywall
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock setup ─────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

// Track which tables were queried via from()
const fromCallLog: string[] = []
const mockServiceClient = vi.fn()

function buildSupabaseMock(plan: 'free' | 'pro' = 'free') {
  const __svcClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'free-user-id', email: 'free@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      fromCallLog.push(table)
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plan },
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
          update: mockUpdate,
          upsert: mockUpsert,
          insert: mockInsert,
        }
      }
      if (table === 'analysis_events') {
        return { insert: mockInsert }
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { name: 'Test Project', context: { business: {}, technical: {} } },
            error: null,
          }),
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

// ─── Module mocks ─────────────────────────────────────────────────────────────

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

function makeAuthenticatedRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function getPostHandler() {
  const { POST } = await import('@/app/api/analyze/route')
  return POST
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Pro Gate: Company Context (Free User Context Leak)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    fromCallLog.length = 0
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock('free') as never)
  })

  // ─── Root Cause #3: validateAnalyzePayload API contract gap ───────────────

  it('Test 1 (Root Cause #3): validateAnalyzePayload with projectId string returns { valid: true, text, projectId }', async () => {
    /**
     * Bug Condition: validateAnalyzePayload returns { valid: true, text } with NO projectId field.
     * Expected (correct): returns { valid: true, text: "valid BRD", projectId: "uuid-123" }
     * On unfixed code: returns { valid: true, text: "valid BRD" } — no projectId → FAILS
     *
     * Validates: Requirements 1.3, 2.3
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: 'valid BRD text', projectId: 'uuid-123' })

    expect(result).toEqual({
      valid: true,
      text: 'valid BRD text',
      projectId: 'uuid-123',
    })
  })

  it('Test 2 (Root Cause #3): validateAnalyzePayload with projectId null returns { valid: true, text, projectId: null }', async () => {
    /**
     * Bug Condition: validateAnalyzePayload ignores projectId entirely.
     * Expected (correct): returns { valid: true, text: "valid BRD", projectId: null }
     * On unfixed code: returns { valid: true, text: "valid BRD" } — no projectId field → FAILS
     *
     * Validates: Requirements 1.3, 2.3
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: 'valid BRD text', projectId: null })

    expect(result).toEqual({
      valid: true,
      text: 'valid BRD text',
      projectId: null,
    })
  })

  it('Test 3 (Root Cause #3): validateAnalyzePayload without projectId returns { valid: true, text, projectId: null }', async () => {
    /**
     * Bug Condition: validateAnalyzePayload returns no projectId field when omitted.
     * Expected (correct): returns { valid: true, text: "valid BRD", projectId: null }
     * On unfixed code: returns { valid: true, text: "valid BRD" } — no projectId field → FAILS
     *
     * Validates: Requirements 1.3, 2.3
     */
    const { validateAnalyzePayload } = await import('@/app/api/analyze/route')

    const result = validateAnalyzePayload({ text: 'valid BRD text' })

    expect(result).toEqual({
      valid: true,
      text: 'valid BRD text',
      projectId: null,
    })
  })

    // ─── Root Cause #1: No project-context plan check in POST /api/analyze ──────

  it('Test 4 (Root Cause #1): POST /api/analyze with free-tier user and projectId — subscriptions queried MORE THAN ONCE (once for usage, once for project gate)', async () => {
    /**
     * Bug Condition: On unfixed code, subscriptions is queried exactly ONCE
     * (by checkUsage for the usage limit). There is no second query for the
     * project context gate. After the fix, subscriptions must be queried at
     * least twice when projectId is provided: once for usage, once for the
     * project context plan check.
     *
     * On unfixed code: subscriptions.from call count === 1 → FAILS
     *
     * Validates: Requirements 1.1, 1.4, 2.4
     */
    const { createClient } = await import('@/lib/supabase/server')

    const subscriptionsSingleSpy = vi.fn().mockResolvedValue({ data: { plan: 'free' }, error: null })

    const localFromSpy = vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: subscriptionsSingleSpy,
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
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'analysis_events') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { name: 'Test Project', context: { business: {}, technical: {} } },
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'free-user-id', email: 'free@example.com' } },
          error: null,
        }),
      },
      from: localFromSpy,
    } as never)
    // checkUsage now reads via the service client — share the same `from` spy so its
    // subscriptions read is counted alongside the project-gate read.
    mockServiceClient.mockReturnValue({ from: localFromSpy } as never)

    const POST = await getPostHandler()
    const req = makeAuthenticatedRequest({ text: 'valid BRD text', projectId: 'some-uuid' })
    const response = await POST(req)

    // Drain the SSE stream so the background IIFE completes
    await drainSSEStream(response)

    // Count how many times subscriptions was queried
    const subscriptionsCallCount = localFromSpy.mock.calls.filter(
      (c) => c[0] === 'subscriptions'
    ).length

    // After the fix: subscriptions must be queried at least twice
    // (once for usage check, once for project context plan gate)
    // On unfixed code: only queried once (usage check only) → FAILS
    expect(subscriptionsCallCount).toBeGreaterThanOrEqual(2)
  })

  it('Test 5 (Root Cause #1): POST /api/analyze with Pro user and projectId injects project context into system prompt', async () => {
    /**
     * Bug Condition: On unfixed code, the route never does a server-side plan
     * check for project context — it ignores projectId entirely. Even a Pro
     * user gets no context injection server-side (the client was doing it).
     *
     * Expected (correct): Pro user with projectId gets "KONTEKS PROJECT" in
     * the system prompt (server-side injection).
     *
     * On unfixed code: system prompt === SYSTEM_PROMPT (no context) → FAILS
     *
     * Validates: Requirements 1.2, 2.2, 2.4
     */
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'pro-user-id', email: 'pro@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
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
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'analysis_events') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                name: 'Acme Corp',
                context: {
                  business: {
                    description: 'E-commerce platform',
                    targetUsers: ['buyers', 'sellers'],
                    domain: 'retail',
                    compliance: [],
                    namingConventions: {},
                    pastDecisions: [],
                  },
                  technical: {
                    frontend: 'Next.js',
                    backend: 'Node.js',
                    existingSystems: [],
                    integrations: [],
                    constraints: [],
                    techDebt: [],
                  },
                },
              },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)

    const { anthropic } = await import('@/lib/anthropic')
    const streamMock = vi.mocked(anthropic.messages.stream)

    const POST = await getPostHandler()
    const req = makeAuthenticatedRequest({ text: 'valid BRD text', projectId: 'pro-project-uuid' })
    const response = await POST(req)

    await drainSSEStream(response)

    expect(streamMock).toHaveBeenCalled()

    const callArgs = streamMock.mock.calls[0][0] as { system: string }

    // For a Pro user with a valid projectId, the system prompt MUST contain
    // the project context block (server-side injection).
    // On unfixed code: system prompt === bare SYSTEM_PROMPT (no context) → FAILS
    expect(callArgs.system).toContain('KONTEKS PROJECT')
  })
})
