import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ChatMessage, AnalysisResult } from '@/types'

const STORAGE_KEY = 'sf_temp_session'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

import { persistAnalysisState, initTempSession, getTempSession } from '@/lib/session/temp-session'

const SAMPLE_ANALYSIS: AnalysisResult = {
  gapList: [{ category: 'Edge Case', description: 'Test gap', severity: 'high' }],
  clarificationQuestions: ['Apa target pengguna?'],
  readinessScore: 60,
  readinessLabel: 'Perlu Klarifikasi',
  sessionId: 'sess-1',
  createdAt: new Date().toISOString(),
}

const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: 'assistant', content: 'Ada pertanyaan...' },
  { role: 'user', content: 'Pengguna kami adalah UMKM.' },
]

beforeEach(() => {
  localStorageMock.clear()
  initTempSession()
})

describe('persistAnalysisState', () => {
  it('saves brdText, messages, and result to the existing temp session', () => {
    persistAnalysisState('My BRD text', SAMPLE_MESSAGES, SAMPLE_ANALYSIS)
    const session = getTempSession()
    expect(session?.brdText).toBe('My BRD text')
    expect(session?.messages).toEqual(SAMPLE_MESSAGES)
    expect(session?.result).toEqual(SAMPLE_ANALYSIS)
  })

  it('does nothing when no session exists in localStorage', () => {
    localStorageMock.clear()
    expect(() => persistAnalysisState('text', [], null)).not.toThrow()
  })

  it('preserves other session fields (refinementRounds, hasGenerated)', () => {
    const before = getTempSession()!
    persistAnalysisState('brd', [], null)
    const after = getTempSession()!
    expect(after.refinementRounds).toBe(before.refinementRounds)
    expect(after.hasGenerated).toBe(before.hasGenerated)
    expect(after.id).toBe(before.id)
  })
})

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes}m lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  return `${days}h lalu`
}

describe('formatRelativeTime', () => {
  it('shows "Baru saja" for brand-new sessions', () => {
    const justNow = new Date(Date.now() - 30_000).toISOString()
    expect(formatRelativeTime(justNow)).toBe('Baru saja')
  })

  it('shows minutes for recent times', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelativeTime(recent)).toBe('5m lalu')
  })

  it('shows hours for times within a day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toBe('2j lalu')
  })

  it('shows days for older times', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2h lalu')
  })
})
