import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Property 2: Preservation — Route Behavior Unchanged After Client Swap
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * These tests observe the CURRENT (unfixed) behavior of all three API routes
 * and assert that behavior is preserved. After the ZDR header fix is applied,
 * these same tests must still pass — proving no regressions were introduced.
 *
 * Observation-first methodology:
 * - Mock @anthropic-ai/sdk to return canned responses (no real API calls)
 * - Mock @/lib/supabase/server to simulate auth states
 * - Assert response status codes and body structure for valid/invalid inputs
 */

// --- Canned AI responses ---
const CANNED_ANALYZE_RESPONSE = JSON.stringify({
  gapList: [
    {
      category: 'Edge Case',
      description: 'Tidak ada penanganan offline state',
      severity: 'high',
      confidence: 'high',
      reference: null,
    },
  ],
  clarificationQuestions: ['Apa target user utama?'],
  readinessScore: 65,
  readinessLabel: 'Perlu Klarifikasi',
})

const CANNED_REFINE_RESPONSE = JSON.stringify({
  message: 'Gap sudah berkurang. Skor naik.',
  readyToFinalize: false,
  analysis: {
    gapList: [
      { category: 'NFR', description: 'Performa belum jelas', severity: 'medium' },
    ],
    clarificationQuestions: ['Berapa target response time?'],
    readinessScore: 72,
    readinessLabel: 'Perlu Klarifikasi',
  },
})

const CANNED_REQUIREMENTS_RESPONSE = JSON.stringify({
  userStories: [
    {
      title: 'Login User',
      asA: 'pengguna terdaftar',
      iWant: 'login ke sistem',
      soThat: 'bisa mengakses fitur premium',
      investNotes: {
        independent: 'Tidak bergantung story lain',
        negotiable: 'Bisa pakai OAuth atau email',
        valuable: 'Akses fitur premium',
        estimable: '2 sprint points',
        small: 'Satu flow login',
        testable: 'Given credentials, when login, then redirect',
      },
      acceptanceCriteria: [
        {
          title: 'Login berhasil',
          given: ['User memiliki akun'],
          when: ['User submit form login'],
          then: ['User redirect ke dashboard'],
        },
      ],
    },
  ],
  generatedAt: '2025-01-01T00:00:00.000Z',
})

// --- SSE stream helpers ---

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

/**
 * Drain an SSE ReadableStream and return the parsed data from the first `done` event.
 * Falls back to trying to parse the body as JSON for non-SSE responses.
 */
async function readSSEDoneData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    return response.json()
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const lines = part.split('\n')
      let eventName = 'message'
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        if (line.startsWith('data: ')) dataLine = line.slice(6).trim()
      }
      if (eventName === 'done' && dataLine) {
        reader.releaseLock()
        return JSON.parse(dataLine)
      }
    }
  }
  return null
}

// --- Mock setup ---

// Mock @/lib/anthropic directly — this is what the routes import.
// Also mock @anthropic-ai/sdk for the constructor-args test in /api/requirements.
const mockStream = vi.fn()
const mockCreate = vi.fn() // kept for /api/requirements which still uses create
const mockAnthropicConstructor = vi.fn()

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: (...args: unknown[]) => mockStream(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
  Anthropic: class {},
}))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages: { stream: typeof mockStream; create: typeof mockCreate }
      constructor(config: unknown) {
        mockAnthropicConstructor(config)
        this.messages = { stream: mockStream, create: mockCreate }
      }
    },
  }
})

// Mock Google AI SDK and Vercel AI SDK (used for free tier, not exercised in these tests)
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-google-model'),
}))

vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}))

// Mock Supabase server client
const mockGetUser = vi.fn()

// Chainable query builder mock for supabase.from(...)
function makeQueryBuilder(data: unknown = null) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = chain
  builder.eq = chain
  builder.single = vi.fn().mockResolvedValue({ data, error: null })
  builder.update = chain
  builder.insert = vi.fn().mockResolvedValue({ data: null, error: null })
  builder.upsert = vi.fn().mockResolvedValue({ data: null, error: null })
  return builder
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'subscriptions') {
    return makeQueryBuilder({ plan: 'pro' }) // pro plan → uses Anthropic (mocked above)
  }
  if (table === 'usage_counters') {
    return makeQueryBuilder({ count: 0, reset_at: null, first_analysis_at: null }) // under limit
  }
  if (table === 'analysis_events') {
    return makeQueryBuilder(null)
  }
  return makeQueryBuilder(null)
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Helper to create NextRequest
function createRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'POST', body, headers = {} } = options
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: new Headers(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}


// ============================================================
// /api/analyze — Preservation Tests
// ============================================================
describe('Property 2: Preservation — /api/analyze route behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockStream.mockImplementation(() => makeStreamFromText(CANNED_ANALYZE_RESPONSE))
    // Reset from mock to return pro plan (uses Anthropic path which is mocked)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'pro' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 0, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })
  })

  /**
   * Validates: Requirement 3.1
   * Observation: /api/analyze returns structured JSON with gapList, readinessScore for valid input
   */
  it('returns structured JSON with gapList and readinessScore for valid authenticated input', async () => {
    const { POST } = await import('@/app/api/analyze/route')

    const request = createRequest('/api/analyze', {
      body: { text: 'BRD dokumen untuk fitur login' },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    // Read the done event data from the SSE stream
    const data = await readSSEDoneData(response)
    expect(data).toHaveProperty('gapList')
    expect(data).toHaveProperty('readinessScore')
    expect(data).toHaveProperty('readinessLabel')
    expect(data).toHaveProperty('clarificationQuestions')
    expect(Array.isArray((data as { gapList: unknown[] }).gapList)).toBe(true)
    expect(typeof (data as { readinessScore: number }).readinessScore).toBe('number')
  })

  /**
   * Validates: Requirement 3.4
   * Observation: unauthenticated requests return 401
   */
  it('returns 401 for unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/analyze/route')

    const request = createRequest('/api/analyze', {
      body: { text: 'Some BRD text' },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  /**
   * Validates: Requirement 3.1
   * Observation: invalid input (missing text) returns 400
   */
  it('returns 400 for missing text field', async () => {
    const { POST } = await import('@/app/api/analyze/route')

    const request = createRequest('/api/analyze', {
      body: { text: '' },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  /**
   * Validates: Requirement 3.1
   * Observation: oversized text returns 413
   */
  it('returns 413 for oversized text', async () => {
    const { POST } = await import('@/app/api/analyze/route')

    const request = createRequest('/api/analyze', {
      body: { text: 'x'.repeat(150_001) },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(413)
  })
})


// ============================================================
// /api/refine — Preservation Tests
// ============================================================
describe('Property 2: Preservation — /api/refine route behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockStream.mockImplementation(() => makeStreamFromText(CANNED_REFINE_RESPONSE))
    // Reset from mock to return pro plan (uses Anthropic path which is mocked)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'pro' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 0, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })
  })

  const validRefineBody = {
    brdText: 'BRD dokumen untuk fitur login',
    initialAnalysis: {
      gapList: [
        { category: 'Edge Case', description: 'Offline state', severity: 'high' },
      ],
      clarificationQuestions: ['Apa target user?'],
      readinessScore: 60,
      readinessLabel: 'Perlu Klarifikasi',
      sessionId: 'session-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    messages: [{ role: 'user', content: 'Target user adalah UMKM owner' }],
    qaAnswers: [{ answer: 'UMKM owner', isOutOfScope: false }],
  }

  /**
   * Validates: Requirement 3.2
   * Observation: /api/refine returns message + readyToFinalize + analysis for valid conversation
   */
  it('returns message, readyToFinalize, and analysis for valid authenticated input', async () => {
    const { POST } = await import('@/app/api/refine/route')

    const request = createRequest('/api/refine', {
      body: validRefineBody,
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const data = await readSSEDoneData(response) as Record<string, unknown>
    expect(data).toHaveProperty('message')
    expect(data).toHaveProperty('readyToFinalize')
    expect(data).toHaveProperty('analysis')
    expect(typeof data.message).toBe('string')
    expect(typeof data.readyToFinalize).toBe('boolean')
  })

  /**
   * Validates: Requirement 3.4
   * Observation: unauthenticated requests return 401
   */
  it('returns 401 for unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/refine/route')

    const request = createRequest('/api/refine', {
      body: validRefineBody,
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  /**
   * Validates: Requirement 3.2
   * Observation: missing brdText returns 400
   */
  it('returns 400 for missing brdText', async () => {
    const { POST } = await import('@/app/api/refine/route')

    const request = createRequest('/api/refine', {
      body: { ...validRefineBody, brdText: '' },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  /**
   * Validates: Requirement 3.2
   * Observation: missing messages returns 400
   */
  it('returns 400 for missing messages', async () => {
    const { POST } = await import('@/app/api/refine/route')

    const request = createRequest('/api/refine', {
      body: { ...validRefineBody, messages: [] },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})


// ============================================================
// /api/requirements — Preservation Tests
// ============================================================
describe('Property 2: Preservation — /api/requirements route behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    // /api/requirements still uses messages.create (not yet converted to SSE)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: CANNED_REQUIREMENTS_RESPONSE }],
    })
    // Reset from mock to return pro plan (uses Anthropic path which is mocked)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'pro' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 0, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })
  })

  const validRequirementsBody = {
    brdText: 'BRD dokumen untuk fitur login',
    initialAnalysis: {
      gapList: [
        { category: 'Edge Case', description: 'Offline state', severity: 'high' },
      ],
      clarificationQuestions: ['Apa target user?'],
      readinessScore: 80,
      readinessLabel: 'Siap',
      sessionId: 'session-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    messages: [
      { role: 'user', content: 'Target user adalah UMKM owner' },
      { role: 'assistant', content: 'Baik, saya catat.' },
    ],
  }

  /**
   * Validates: Requirement 3.3
   * Observation: /api/requirements returns userStories JSON for valid input
   */
  it('returns userStories JSON for valid authenticated input', async () => {
    const { POST } = await import('@/app/api/requirements/route')

    const request = createRequest('/api/requirements', {
      body: validRequirementsBody,
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('userStories')
    expect(Array.isArray(data.userStories)).toBe(true)
    expect(data.userStories.length).toBeGreaterThan(0)
    expect(data.userStories[0]).toHaveProperty('title')
    expect(data.userStories[0]).toHaveProperty('asA')
    expect(data.userStories[0]).toHaveProperty('iWant')
    expect(data.userStories[0]).toHaveProperty('soThat')
    expect(data.userStories[0]).toHaveProperty('investNotes')
    expect(data.userStories[0]).toHaveProperty('acceptanceCriteria')
  })

  /**
   * Validates: Requirement 3.4
   * Observation: unauthenticated requests return 401
   */
  it('returns 401 for unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/requirements/route')

    const request = createRequest('/api/requirements', {
      body: validRequirementsBody,
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  /**
   * Validates: Requirement 3.3
   * Observation: missing brdText returns 400
   */
  it('returns 400 for missing brdText', async () => {
    const { POST } = await import('@/app/api/requirements/route')

    const request = createRequest('/api/requirements', {
      body: { ...validRequirementsBody, brdText: '' },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  /**
   * Validates: Requirement 3.3
   * Observation: missing initialAnalysis returns 400
   */
  it('returns 400 for missing initialAnalysis', async () => {
    const { POST } = await import('@/app/api/requirements/route')

    const request = createRequest('/api/requirements', {
      body: { ...validRequirementsBody, initialAnalysis: null },
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  /**
   * Validates: Requirement 3.6
   * Observation: Anthropic client is constructed with apiKey from environment
   */
  it('Anthropic client uses ANTHROPIC_API_KEY from environment', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key-123'
    // Re-import to trigger fresh module evaluation
    vi.resetModules()

    // Re-apply mocks after resetModules
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class MockAnthropic {
        messages: { create: typeof mockCreate; stream: typeof mockStream }
        constructor(config: unknown) {
          mockAnthropicConstructor(config)
          this.messages = { create: mockCreate, stream: mockStream }
        }
      },
    }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      })),
    }))
    // Unmock @/lib/anthropic so the real module runs and calls the SDK constructor
    vi.doUnmock('@/lib/anthropic')

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: CANNED_ANALYZE_RESPONSE }],
    })

    // Import lib/anthropic directly to trigger the Anthropic constructor
    await import('@/lib/anthropic')

    // The Anthropic constructor should have been called with the env var
    expect(mockAnthropicConstructor).toHaveBeenCalled()
    const config = mockAnthropicConstructor.mock.calls[0][0] as { apiKey?: string }
    expect(config.apiKey).toBe('test-api-key-123')
  })
})
