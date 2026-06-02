import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
      single: mockSingle,
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  })),
}))

function request(body: unknown) {
  return new NextRequest('http://localhost/api/save-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const enhancedAnalysis = {
  gapList: [{ category: 'Duplikasi aksi', description: 'Belum jelas.', severity: 'high' }],
  clarificationQuestions: ['Apa yang terjadi kalau user klik dua kali?'],
  readinessScore: 76,
  readinessLabel: 'Perlu Klarifikasi',
  scoreComponents: {
    kelengkapanAlur: { score: 80, explanation: 'Alur cukup jelas.' },
    kesiapanSprint: { score: 70, explanation: 'Ada skenario yang perlu ditanya.' },
    kejelasanRequirement: { score: 75, explanation: 'Requirement cukup jelas.' },
    konteksBisnis: { score: 80, explanation: 'Konteks cukup lengkap.' },
    topActions: ['Lengkapi skenario gagal.'],
  },
  ringkasanTemuan: {
    criticalGaps: [{ text: 'Belum jelas.', severity: 'high', source: 'storyforge' }],
    questionsToAsk: [{ text: 'Apa yang terjadi kalau user klik dua kali?', severity: 'high', source: 'storyforge' }],
    requirementsToAdd: [{ text: 'Sistem harus mencegah data ganda.', severity: 'high', source: 'storyforge' }],
    totalNewFindings: 1,
  },
  gapCards: [
    {
      id: 'gap-1',
      yangBelumJelas: 'Belum jelas.',
      kenapaPenting: 'User bisa membuat data ganda.',
      pertanyaanUntukTim: 'Apa yang terjadi kalau user klik dua kali?',
      usulanRequirement: 'Sistem harus mencegah data ganda.',
      category: 'Duplikasi aksi',
      severity: 'high',
      source: 'storyforge',
      brdReference: null,
    },
  ],
  journeyMap: null,
  version: 2,
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mockUpsert.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({ data: { id: 'analysis-1' }, error: null })
})

describe('/api/save-session v2 persistence', () => {
  it('persists enhanced analysis columns with schema_version 2', async () => {
    const { POST } = await import('@/app/api/save-session/route')

    const response = await POST(
      request({
        sessionId: 'session-1',
        brdText: 'BRD text',
        initialAnalysis: enhancedAnalysis,
        messages: [],
        sections: {},
        sectionStates: {},
      })
    )

    expect(response.status).toBe(200)
    const payload = mockUpsert.mock.calls[0][0]
    expect(payload.schema_version).toBe(2)
    expect(payload.score_components).toEqual(enhancedAnalysis.scoreComponents)
    expect(payload.ringkasan_temuan).toEqual(enhancedAnalysis.ringkasanTemuan)
    expect(payload.gap_cards).toEqual(enhancedAnalysis.gapCards)
    expect(payload.journey_map).toBeNull()
  })
})
