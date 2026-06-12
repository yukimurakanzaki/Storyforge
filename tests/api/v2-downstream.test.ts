import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockStream = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    })),
  })),
}))

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: mockStream,
      create: mockCreate,
    },
  },
}))

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
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
      const name = part.split('\n').find((line) => line.startsWith('event: '))?.slice(7).trim()
      const data = part.split('\n').find((line) => line.startsWith('data: '))?.slice(6).trim()
      if (name && data) events.push({ name, data: JSON.parse(data) })
    }
  }

  return events
}

const v2Analysis: EnhancedAnalysisResult = {
  gapList: [
    {
      category: 'Duplikasi aksi',
      description: 'Belum jelas apa yang terjadi jika user klik tombol dua kali.',
      severity: 'high',
      confidence: 'high',
    },
  ],
  clarificationQuestions: ['Kalau user klik tombol dua kali, apakah sistem membuat dua transaksi?'],
  readinessScore: 72,
  readinessLabel: 'Perlu Klarifikasi',
  scoreComponents: {
    kelengkapanAlur: { score: 70, explanation: 'Alur utama ada, tapi kondisi gagal belum lengkap.' },
    kesiapanSprint: { score: 65, explanation: 'Masih ada skenario yang perlu ditanyakan ke tim.' },
    kejelasanRequirement: { score: 75, explanation: 'Requirement utama cukup jelas.' },
    konteksBisnis: { score: 80, explanation: 'Tujuan bisnis cukup jelas.' },
    topActions: ['Tentukan perilaku saat user mengirim aksi yang sama lebih dari sekali.'],
  },
  ringkasanTemuan: {
    criticalGaps: [
      {
        text: 'Belum jelas apa yang terjadi jika user klik tombol dua kali.',
        severity: 'high',
        source: 'storyforge',
      },
    ],
    questionsToAsk: [
      {
        text: 'Kalau user klik tombol dua kali, apakah sistem membuat dua transaksi?',
        severity: 'high',
        source: 'storyforge',
      },
    ],
    requirementsToAdd: [
      {
        text: 'Sistem harus mencegah transaksi ganda dari aksi yang sama.',
        severity: 'high',
        source: 'storyforge',
      },
    ],
    totalNewFindings: 1,
  },
  gapCards: [
    {
      id: 'gap-1',
      yangBelumJelas: 'Belum jelas apa yang terjadi jika user klik tombol dua kali.',
      kenapaPenting: 'User bisa membuat transaksi ganda dan tim harus memperbaiki data manual.',
      pertanyaanUntukTim: 'Kalau user klik tombol dua kali, apakah sistem membuat dua transaksi?',
      usulanRequirement: 'Sistem harus mencegah transaksi ganda dari aksi yang sama.',
      category: 'Duplikasi aksi',
      severity: 'high',
      source: 'storyforge',
      brdReference: null,
    },
  ],
  journeyMap: null,
  version: 2,
}

describe('v2 analysis downstream compatibility', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { plan: 'pro' }, error: null })
  })

  it('feeds a v2 analysis result to /api/refine and receives a valid refinement response', async () => {
    mockStream.mockReturnValue(
      makeStream(JSON.stringify({
        message: 'Pertanyaan duplikasi aksi sudah terjawab.',
        readyToFinalize: true,
        analysis: {
          gapList: [],
          clarificationQuestions: [],
          readinessScore: 84,
          readinessLabel: 'Siap',
        },
      }))
    )

    const { POST } = await import('@/app/api/refine/route')
    const response = await POST(makeRequest('http://localhost/api/refine', {
      brdText: 'User klik Submit untuk membuat transaksi.',
      initialAnalysis: v2Analysis,
      messages: [{ role: 'user', content: 'Jika klik dua kali, sistem hanya boleh membuat satu transaksi.' }],
    }))
    const events = await collectSSE(response)
    const done = events.find((event) => event.name === 'done')?.data as Record<string, unknown>

    expect(done.message).toContain('duplikasi aksi')
    expect(done.readyToFinalize).toBe(true)
    expect(done.analysis).toMatchObject({
      readinessScore: 84,
      readinessLabel: 'Siap',
    })
    expect(mockStream).toHaveBeenCalledOnce()
  })

  it('feeds a v2 analysis result to /api/requirements and receives generated user stories', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            generatedAt: '2026-06-02T00:00:00.000Z',
            userStories: [
              {
                title: 'Cegah Transaksi Ganda',
                asA: 'pengguna',
                iWant: 'mengirim transaksi sekali saja',
                soThat: 'data transaksi tidak ganda',
                investNotes: {
                  independent: 'Dapat diuji pada submit transaksi.',
                  negotiable: 'Aturan tampilan pesan bisa disesuaikan.',
                  valuable: 'Mencegah data ganda.',
                  estimable: 'Scope perilaku submit jelas.',
                  small: 'Dapat dibuat dalam satu sprint.',
                  testable: 'Dapat diuji dengan klik submit dua kali.',
                },
                acceptanceCriteria: [
                  {
                    title: 'Klik dua kali tidak membuat transaksi ganda',
                    given: ['Pengguna berada di form transaksi'],
                    when: ['Pengguna klik Submit dua kali'],
                    then: ['Sistem hanya membuat satu transaksi'],
                  },
                ],
              },
            ],
          }),
        },
      ],
    })

    const { POST } = await import('@/app/api/requirements/route')
    const response = await POST(makeRequest('http://localhost/api/requirements', {
      brdText: 'User klik Submit untuk membuat transaksi.',
      initialAnalysis: v2Analysis,
      messages: [{ role: 'user', content: 'Tambahkan pencegahan transaksi ganda.' }],
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.userStories).toHaveLength(1)
    expect(body.userStories[0].title).toBe('Cegah Transaksi Ganda')
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})
