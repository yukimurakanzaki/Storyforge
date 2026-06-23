import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Compatibility-deploy regression for the legacy /api/analyze route.
 *
 * During the flag-OFF compatibility deploy, the new code runs against the OLD
 * schema where `analysis_events` does not exist yet. logAnalysisEvent now throws
 * on the resulting PGRST205. This test pins that the initial analysis_started
 * write is BEST-EFFORT: a missing analysis_events table must NOT prevent a
 * successful analysis (the request must still stream a `done` event).
 */

const mockGetUser = vi.fn()
const mockStream = vi.fn()

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { stream: mockStream } },
  Anthropic: class {},
}))
vi.mock('@ai-sdk/google', () => ({ google: vi.fn(() => 'mock-google-model') }))
vi.mock('ai', () => ({ streamText: vi.fn(), generateText: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Pre-migration service client: tables are missing -> PGRST205 on every access.
const PGRST205 = { code: 'PGRST205', message: 'Could not find the table in the schema cache' }
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'subscriptions' || table === 'usage_counters') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: PGRST205 }) }) }),
          insert: async () => ({ error: PGRST205 }),
          update: () => ({ eq: async () => ({ error: PGRST205 }) }),
        }
      }
      // analysis_events: insert rejects with PGRST205 -> logAnalysisEvent throws
      return { insert: async () => ({ error: PGRST205 }) }
    },
  })),
}))

function validJsonStream() {
  const text = JSON.stringify({
    gapList: [], clarificationQuestions: [], readinessScore: 80, readinessLabel: 'Siap',
  })
  return {
    [Symbol.asyncIterator]() {
      let done = false
      return {
        async next() {
          if (!done) { done = true; return { value: { type: 'content_block_delta', delta: { type: 'text_delta', text } }, done: false } }
          return { value: undefined, done: true }
        },
      }
    },
  }
}

async function drain(response: Response): Promise<string[]> {
  if (!response.body) return []
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const names: string[] = []
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) for (const line of part.split('\n')) if (line.startsWith('event: ')) names.push(line.slice(7).trim())
  }
  return names
}

describe('/api/analyze — compatibility deploy (analysis_events absent / PGRST205)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockStream.mockReturnValue(validJsonStream())
  })

  it('still completes a successful analysis when the analytics write throws PGRST205', async () => {
    const { POST } = await import('@/app/api/analyze/route')
    const req = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'BRD untuk fitur baru.' }),
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    const events = await drain(response)
    expect(events).toContain('done')
  })
})
