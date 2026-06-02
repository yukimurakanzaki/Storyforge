import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn()
const mockStream = vi.fn()
const mockCheckUsage = vi.fn()
const mockIncrementUsage = vi.fn()
const mockLogAnalysisEvent = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      insert: mockInsert,
      update: mockUpdate,
    })),
  })),
}))

vi.mock('@/lib/usage', () => ({
  checkUsage: mockCheckUsage,
  incrementUsage: mockIncrementUsage,
  logAnalysisEvent: mockLogAnalysisEvent,
}))

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: mockStream,
    },
  },
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeStream(text: string) {
  const events = [{ type: 'content_block_delta', delta: { type: 'text_delta', text } }]
  return {
    [Symbol.asyncIterator]() {
      let index = 0
      return {
        async next() {
          if (index < events.length) return { value: events[index++], done: false }
          return { value: undefined, done: true }
        },
      }
    },
  }
}

const validV2 = {
  scoreComponents: {
    kelengkapanAlur: { score: 80, explanation: 'Alur utama cukup jelas.' },
    kesiapanSprint: { score: 70, explanation: 'Masih ada skenario yang perlu ditanya.' },
    kejelasanRequirement: { score: 75, explanation: 'Requirement cukup jelas.' },
    konteksBisnis: { score: 80, explanation: 'Konteks bisnis cukup lengkap.' },
    topActions: [],
  },
  ringkasanTemuan: {
    criticalGaps: [],
    questionsToAsk: [],
    requirementsToAdd: [],
    totalNewFindings: 1,
  },
  gapCards: [
    {
      id: 'gap-1',
      yangBelumJelas: 'Belum jelas apa yang terjadi jika user klik dua kali.',
      kenapaPenting: 'User bisa membuat data ganda.',
      pertanyaanUntukTim: 'Kalau user klik tombol dua kali, apakah sistem membuat dua data?',
      usulanRequirement: 'Sistem harus mencegah data ganda dari aksi yang sama.',
      category: 'Duplikasi aksi',
      severity: 'high',
      source: 'storyforge',
      brdReference: 'User klik Submit',
    },
  ],
  journeyMap: null,
  readinessScore: 76,
  readinessLabel: 'Perlu Klarifikasi',
}

async function collectSSE(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: Array<{ name: string; data: unknown }> = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      const name = lines.find((line) => line.startsWith('event: '))?.slice(7).trim()
      const data = lines.find((line) => line.startsWith('data: '))?.slice(6).trim()
      if (name && data) events.push({ name, data: JSON.parse(data) })
    }
  }

  return events
}

async function getPost() {
  const mod = await import('@/app/api/analyze/route')
  return mod.POST
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env.ANALYSIS_V2_ENABLED = 'true'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockSingle.mockResolvedValue({ data: { plan: 'pro' } })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockUpdateEq.mockResolvedValue({ error: null })
  mockCheckUsage.mockResolvedValue({ allowed: true, count: 0, limit: 50, plan: 'pro' })
  mockIncrementUsage.mockResolvedValue(undefined)
  mockLogAnalysisEvent.mockResolvedValue(undefined)
  mockStream.mockReturnValue(makeStream(JSON.stringify(validV2)))
})

describe('/api/analyze v2', () => {
  it('emits status then done with v2 and legacy fields', async () => {
    const POST = await getPost()
    const response = await POST(makeRequest({ text: 'User klik Submit untuk mengirim formulir.' }))
    const events = await collectSSE(response)

    expect(events[0].name).toBe('status')
    expect(events.at(-1)?.name).toBe('done')

    const done = events.at(-1)?.data as Record<string, unknown>
    expect(done.version).toBe(2)
    expect(done).toHaveProperty('gapList')
    expect(done).toHaveProperty('clarificationQuestions')
    expect(done).toHaveProperty('readinessScore')
    expect(done).toHaveProperty('readinessLabel')
    expect(done).toHaveProperty('gapCards')
  })

  it('keeps v1 delta behavior when feature flag is disabled', async () => {
    process.env.ANALYSIS_V2_ENABLED = 'false'
    mockStream.mockReturnValue(
      makeStream('{"gapList":[],"clarificationQuestions":[],"readinessScore":80,"readinessLabel":"Siap"}')
    )

    const POST = await getPost()
    const response = await POST(makeRequest({ text: 'BRD lengkap.' }))
    const events = await collectSSE(response)

    expect(events.map((event) => event.name)).toContain('delta')
    expect(events.map((event) => event.name)).toContain('done')
  })

  it('retries malformed JSON once and then emits error', async () => {
    mockStream.mockReturnValue(makeStream('not json'))

    const POST = await getPost()
    const response = await POST(makeRequest({ text: 'User klik Submit.' }))
    const events = await collectSSE(response)

    expect(mockStream).toHaveBeenCalledTimes(2)
    expect(events.at(-1)?.name).toBe('error')
    expect(mockIncrementUsage).not.toHaveBeenCalled()
  })
})
