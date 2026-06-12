import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/types'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'
import { mergeRefinementAnalysis } from '@/lib/analysis/refinement-state'

const v2Result: EnhancedAnalysisResult = {
  gapList: [{ category: 'Duplikasi aksi', description: 'Belum jelas.', severity: 'high' }],
  clarificationQuestions: ['Apa yang terjadi kalau user klik dua kali?'],
  readinessScore: 72,
  readinessLabel: 'Perlu Klarifikasi',
  scoreComponents: {
    kelengkapanAlur: { score: 70, explanation: 'Alur belum lengkap.' },
    kesiapanSprint: { score: 70, explanation: 'Masih ada pertanyaan.' },
    kejelasanRequirement: { score: 75, explanation: 'Cukup jelas.' },
    konteksBisnis: { score: 80, explanation: 'Konteks cukup.' },
    topActions: ['Tentukan perilaku klik dua kali.'],
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
      kenapaPenting: 'Bisa membuat data ganda.',
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

const storedV2Result = {
  ...v2Result,
  sessionId: 'session-1',
  createdAt: '2026-06-02T00:00:00.000Z',
}

const refinedAnalysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'> = {
  gapList: [],
  clarificationQuestions: [],
  readinessScore: 84,
  readinessLabel: 'Siap',
}

describe('mergeRefinementAnalysis', () => {
  it('marks v2 review details as needing reanalysis instead of preserving stale gap cards', () => {
    const result = mergeRefinementAnalysis(storedV2Result, refinedAnalysis)

    expect(result.readinessScore).toBe(84)
    expect(result.readinessLabel).toBe('Siap')
    expect('gapCards' in result).toBe(false)
    expect('scoreComponents' in result).toBe(false)
    expect('ringkasanTemuan' in result).toBe(false)
    expect('journeyMap' in result).toBe(false)
    expect('version' in result).toBe(false)
    expect(result.needsReanalysis).toBe(true)
  })
})
