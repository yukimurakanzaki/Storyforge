/**
 * Tier enforcement + measurement on the PRIMARY living-workspace endpoint.
 *
 * Context: the 2026-06-14 Launch Readiness Audit found that POST /api/workspace
 * (now the default flow) did NOT enforce usage limits, increment the usage
 * counter, or log analysis_events (the source of the WAA North Star Metric) —
 * all of which the legacy /api/analyze route does. These tests pin down the fix.
 *
 * Billing-unit decision (encoded here):
 *  - 1 "analysis" = 1 NEW living session (no existing row).
 *  - Continuing an existing session is always allowed and never consumes quota
 *    (the living-workspace promise: iterate freely over days).
 *  - Every successful turn is MEASURED (analysis_started + analysis_completed),
 *    so WAA / completion rate capture returning-session engagement too.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ModelTurnResponse } from '@/types/workspace'

const mockCreate = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: mockCreate } },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/analysis/context-loader', () => ({
  loadContextLayers: vi.fn().mockResolvedValue(''),
}))

const user = { id: '11111111-1111-1111-1111-111111111111' }

function makeTurn(overrides: Partial<ModelTurnResponse> = {}): ModelTurnResponse {
  return {
    intent: 'new_or_expanded_requirement',
    assistantMessage: 'Saya menemukan beberapa gap.',
    newGaps: [],
    resolvedGapIds: [],
    gapAnswers: {},
    outOfScopeGapIds: [],
    prd: null,
    ...overrides,
  }
}

function anthropicText(text: string) {
  return { content: [{ type: 'text', text }] }
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readSSE(response: Response) {
  const text = await response.text()
  const events: Array<{ event: string; data: unknown }> = []
  for (const chunk of text.trim().split('\n\n').filter(Boolean)) {
    const event = chunk.split('\n').find((line) => line.startsWith('event: '))?.slice(7)
    const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '))?.slice(6)
    if (event && dataLine) events.push({ event, data: JSON.parse(dataLine) })
  }
  return events
}

const EXISTING_ROW = {
  id: 'row-1',
  user_id: user.id,
  session_id: 'session-1',
  brd_text: 'Existing BRD',
  title: 'Existing',
  gaps: [],
  messages: [],
  readiness_score: 100,
  readiness_label: 'Siap',
}

function buildSupabase(options: {
  authUser?: typeof user | null
  existingRow?: Record<string, unknown> | null
  plan?: 'free' | 'pro'
  usageCount?: number
  usageRowExists?: boolean
} = {}) {
  const plan = options.plan ?? 'free'
  const usageRow =
    options.usageRowExists === false
      ? null
      : { count: options.usageCount ?? 0, reset_at: null, first_analysis_at: null }

  const analysisResultsInsert = vi.fn().mockResolvedValue({ error: null })
  const analysisResultsUpdate = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) })
  const usageInsert = vi.fn().mockResolvedValue({ error: null })
  const usageUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const eventsInsert = vi.fn().mockResolvedValue({ error: null })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: Object.prototype.hasOwnProperty.call(options, 'authUser') ? options.authUser : user },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'analysis_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: options.existingRow ?? null, error: null }),
          insert: analysisResultsInsert,
          update: analysisResultsUpdate,
        }
      }
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
          single: vi.fn().mockResolvedValue({ data: usageRow, error: null }),
          insert: usageInsert,
          update: usageUpdate,
        }
      }
      if (table === 'analysis_events') {
        return { insert: eventsInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
    }),
    __mocks: { analysisResultsInsert, analysisResultsUpdate, usageInsert, usageUpdate, eventsInsert },
  }

  return supabase
}

async function postWorkspace(
  supabase: ReturnType<typeof buildSupabase>,
  body: { sessionId?: string; message?: string } = {},
) {
  mockCreateClient.mockResolvedValue(supabase)
  mockCreate.mockResolvedValue(anthropicText(JSON.stringify(makeTurn())))

  vi.resetModules()
  const { POST } = await import('@/app/api/workspace/route')
  return POST(
    makeRequest({
      sessionId: 'session-1',
      message: 'Sistem perlu fitur upload dokumen PDF oleh nasabah.',
      ...body,
    }),
  )
}

describe('POST /api/workspace — tier enforcement & measurement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 429 with X-Limit-Reached when a free user at the limit starts a NEW session', async () => {
    const supabase = buildSupabase({ existingRow: null, plan: 'free', usageCount: 3 })
    const response = await postWorkspace(supabase)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-Limit-Reached')).toBe('true')
    // The expensive model call must not happen when blocked.
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does NOT block continuing an EXISTING session even when the free user is at the limit', async () => {
    const supabase = buildSupabase({ existingRow: EXISTING_ROW, plan: 'free', usageCount: 5 })
    const response = await postWorkspace(supabase)

    expect(response.status).toBe(200)
    const events = await readSSE(response)
    expect(events.at(-1)?.event).toBe('done')
  })

  it('increments the usage counter when a NEW session completes successfully', async () => {
    const supabase = buildSupabase({ existingRow: null, plan: 'free', usageCount: 0 })
    const response = await postWorkspace(supabase)
    await readSSE(response)

    const mutations =
      supabase.__mocks.usageInsert.mock.calls.length + supabase.__mocks.usageUpdate.mock.calls.length
    expect(mutations).toBeGreaterThan(0)
  })

  it('does NOT consume quota for a follow-up turn on an EXISTING session', async () => {
    const supabase = buildSupabase({ existingRow: EXISTING_ROW, plan: 'free', usageCount: 0 })
    const response = await postWorkspace(supabase)
    await readSSE(response)

    expect(supabase.__mocks.usageInsert).not.toHaveBeenCalled()
    expect(supabase.__mocks.usageUpdate).not.toHaveBeenCalled()
  })

  it('logs analysis_started and analysis_completed to analysis_events on success', async () => {
    const supabase = buildSupabase({ existingRow: null, plan: 'free', usageCount: 0 })
    const response = await postWorkspace(supabase)
    await readSSE(response)

    const eventTypes = supabase.__mocks.eventsInsert.mock.calls.map(
      (call) => (call[0] as { event_type: string }).event_type,
    )
    expect(eventTypes).toContain('analysis_started')
    expect(eventTypes).toContain('analysis_completed')
  })
})
