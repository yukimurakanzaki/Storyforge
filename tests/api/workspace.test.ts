import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ModelTurnResponse } from '@/types/workspace'

const mockCreate = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: mockCreate,
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}))

vi.mock('@/lib/analysis/context-loader', () => ({
  loadContextLayers: vi.fn().mockResolvedValue(''),
}))

const user = { id: '11111111-1111-1111-1111-111111111111' }

type TableName = 'analysis_results' | 'subscriptions' | 'user_context'

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

function buildSupabase(options: {
  authUser?: typeof user | null
  existingRow?: Record<string, unknown> | null
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: updateEq }) })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: Object.prototype.hasOwnProperty.call(options, 'authUser') ? options.authUser : user },
        error: null,
      }),
    },
    from: vi.fn((table: TableName) => {
      if (table === 'analysis_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: options.existingRow ?? null, error: null }),
          insert,
          update,
          upsert: vi.fn().mockResolvedValue({ error: { message: 'should not upsert' } }),
        }
      }
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
    __mocks: { insert, update, updateEq },
  }

  mockCreateServiceClient.mockReturnValue(supabase)
  return supabase
}

async function postWorkspace(supabase: ReturnType<typeof buildSupabase>, turn: ModelTurnResponse | string) {
  mockCreateClient.mockResolvedValue(supabase)
  mockCreate.mockResolvedValue(anthropicText(typeof turn === 'string' ? turn : JSON.stringify(turn)))

  vi.resetModules()
  const { POST } = await import('@/app/api/workspace/route')
  return POST(makeRequest({
    sessionId: 'session-1',
    message: 'Sistem perlu fitur upload dokumen PDF oleh nasabah.',
  }))
}

describe('POST /api/workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new session with INSERT when no row exists', async () => {
    const supabase = buildSupabase({ existingRow: null })

    const response = await postWorkspace(supabase, makeTurn())
    const events = await readSSE(response)

    expect(events.at(-1)?.event).toBe('done')
    expect(supabase.__mocks.insert).toHaveBeenCalledTimes(1)
    expect(supabase.__mocks.update).not.toHaveBeenCalled()
  })

  it('loads an existing session and persists with UPDATE', async () => {
    const supabase = buildSupabase({
      existingRow: {
        id: 'row-1',
        user_id: user.id,
        session_id: 'session-1',
        brd_text: 'Existing BRD',
        title: 'Existing',
        gaps: [],
        messages: [],
        readiness_score: 100,
        readiness_label: 'Siap',
      },
    })

    const response = await postWorkspace(supabase, makeTurn())
    const events = await readSSE(response)

    expect(events.at(-1)?.event).toBe('done')
    expect(supabase.__mocks.update).toHaveBeenCalledTimes(1)
    expect(supabase.__mocks.insert).not.toHaveBeenCalled()
  })

  it('populates state gaps and lowers score when model returns newGaps', async () => {
    const supabase = buildSupabase({ existingRow: null })
    const response = await postWorkspace(supabase, makeTurn({
      newGaps: [{
        category: 'functional',
        description: 'Belum ada batasan ukuran dan format upload PDF.',
        severity: 'high',
        question: 'Berapa ukuran maksimal PDF dan format apa saja yang diterima?',
        source: 'brd',
        conflictsWith: null,
      }],
    }))

    const done = (await readSSE(response)).find((event) => event.event === 'done')!
    const data = done.data as { state: { gaps: unknown[]; readinessScore: number } }

    expect(data.state.gaps).toHaveLength(1)
    expect(data.state.readinessScore).toBeLessThan(100)
  })

  it('emits SSE error and does not persist when model JSON parsing fails', async () => {
    const supabase = buildSupabase({ existingRow: null })
    const response = await postWorkspace(supabase, 'not json')
    const events = await readSSE(response)

    expect(events.at(-1)?.event).toBe('error')
    expect(supabase.__mocks.insert).not.toHaveBeenCalled()
    expect(supabase.__mocks.update).not.toHaveBeenCalled()
  })

  it('sanitizes invalid severity to medium before applying the turn', async () => {
    const supabase = buildSupabase({ existingRow: null })
    const response = await postWorkspace(supabase, makeTurn({
      newGaps: [{
        category: 'functional',
        description: 'd',
        severity: 'critical' as 'high',
        question: 'q',
        source: 'brd',
      }],
    }))

    const done = (await readSSE(response)).find((event) => event.event === 'done')!
    const data = done.data as { state: { gaps: Array<{ severity: string }> } }

    expect(data.state.gaps[0].severity).toBe('medium')
  })

  it('returns 401 for unauthenticated requests', async () => {
    const supabase = buildSupabase({ authUser: null })
    mockCreateClient.mockResolvedValue(supabase)

    vi.resetModules()
    const { POST } = await import('@/app/api/workspace/route')
    const response = await POST(makeRequest({ sessionId: 'session-1', message: 'Halo' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })
})
