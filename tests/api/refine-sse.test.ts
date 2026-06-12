/**
 * Unit tests for /api/refine pre-stream error paths
 *
 * These tests verify that auth, rate-limit, and validation errors return
 * regular JSON responses (not SSE) before the stream starts.
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Anthropic mock — stream() returns an async iterable that yields nothing
// (pre-stream tests never reach the Anthropic call)
vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // yields nothing — stream ends immediately
        },
      }),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ANALYSIS = {
  gapList: [],
  clarificationQuestions: [],
  readinessScore: 60,
  readinessLabel: 'Perlu Klarifikasi',
  sessionId: 'sess-1',
  createdAt: new Date().toISOString(),
}

const VALID_MESSAGES = [{ role: 'user', content: 'Tolong perjelas bagian payment.' }]

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost/api/refine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function makeAuthRequest(body: unknown): NextRequest {
  return makeRequest(body)
}

function buildSupabaseMock(user: { id: string } | null = { id: 'user-1' }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
        }),
      }),
    }),
  }
}

async function getPostHandler() {
  const { POST } = await import('@/app/api/refine/route')
  return POST
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('/api/refine — pre-stream error paths', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Default: authenticated user
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never)
  })

  // ─── Auth tests ─────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when no auth session (user mode)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(null) as never)

      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns JSON (not SSE) for 401 — Content-Type is application/json', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(null) as never)

      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
      expect(res.headers.get('Content-Type')).toContain('application/json')
    })
  })

  // ─── Body validation tests ───────────────────────────────────────────────────

  describe('body validation', () => {
    it('returns 400 when brdText is missing', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing brdText')
    })

    it('returns 400 when brdText is empty string', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: '   ',
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing brdText')
    })

    it('returns 413 when brdText exceeds 150,000 characters', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'x'.repeat(150_001),
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(413)

      const body = await res.json()
      expect(body.error).toBe('BRD text too large')
    })

    it('returns 400 when initialAnalysis is missing', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing initialAnalysis')
    })

    it('returns 400 when initialAnalysis is not an object', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: 'not-an-object',
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing initialAnalysis')
    })

    it('returns 400 when messages is missing', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: VALID_ANALYSIS,
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing messages')
    })

    it('returns 400 when messages is an empty array', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: VALID_ANALYSIS,
        messages: [],
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Missing messages')
    })

    it('returns 400 when last message is not from user', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Some BRD',
        initialAnalysis: VALID_ANALYSIS,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Response' },
        ],
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Last message must be from user')
    })

    it('returns JSON (not SSE) for all validation errors', async () => {
      const POST = await getPostHandler()

      const errorCases = [
        { brdText: '', initialAnalysis: VALID_ANALYSIS, messages: VALID_MESSAGES },
        { brdText: 'BRD', messages: VALID_MESSAGES },
        { brdText: 'BRD', initialAnalysis: VALID_ANALYSIS },
      ]

      for (const body of errorCases) {
        const req = makeAuthRequest(body)
        const res = await POST(req)
        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(res.headers.get('Content-Type')).toContain('application/json')
      }
    })
  })

  // ─── Success path — SSE response ─────────────────────────────────────────────

  describe('success path', () => {
    it('returns 200 with text/event-stream Content-Type for valid request', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Valid BRD text',
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('returns Cache-Control: no-cache for SSE response', async () => {
      const POST = await getPostHandler()
      const req = makeAuthRequest({
        brdText: 'Valid BRD text',
        initialAnalysis: VALID_ANALYSIS,
        messages: VALID_MESSAGES,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-cache')
    })
  })
})
