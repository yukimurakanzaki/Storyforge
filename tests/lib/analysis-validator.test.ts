import { describe, expect, it } from 'vitest'
import { validateAndNormalize } from '@/lib/analysis-validator'
import type { GapCard, ScoreComponents } from '@/types/analysis-v2'

const scoreComponents: ScoreComponents = {
  kelengkapanAlur: { score: 40, explanation: 'Alur belum lengkap.' },
  kesiapanSprint: { score: 60, explanation: 'Masih ada hal yang perlu ditanya.' },
  kejelasanRequirement: { score: 70, explanation: 'Sebagian requirement sudah jelas.' },
  konteksBisnis: { score: 80, explanation: 'Konteks bisnis cukup jelas.' },
  topActions: [],
}

function makeCard(overrides: Partial<GapCard> = {}): GapCard {
  return {
    id: 'gap-1',
    yangBelumJelas: 'Belum jelas apa yang terjadi jika user klik dua kali.',
    kenapaPenting: 'User bisa membuat data ganda dan tim perlu melakukan koreksi manual.',
    pertanyaanUntukTim: 'Kalau user klik tombol dua kali, apakah sistem membuat dua data?',
    usulanRequirement: 'Sistem harus mencegah pembuatan data ganda ketika user mengirim aksi yang sama lebih dari sekali.',
    category: 'technical blindspot',
    severity: 'high',
    source: 'storyforge',
    brdReference: 'User klik Submit',
    ...overrides,
  }
}

describe('validateAndNormalize', () => {
  it('truncates gap cards, validates references, strips category jargon, and recomputes score/label/count', () => {
    const brdText = 'User klik Submit untuk mengirim formulir.'
    const cards = Array.from({ length: 12 }, (_, index) =>
      makeCard({
        id: index < 2 ? 'duplicate' : `gap-${index}`,
        brdReference: index === 0 ? 'User klik Submit' : 'Tidak ada di BRD',
        source: index % 2 === 0 ? 'storyforge' : 'brd',
      })
    )

    const { result, warnings } = validateAndNormalize(
      {
        gapCards: cards,
        scoreComponents,
        readinessScore: 99,
        readinessLabel: 'Siap',
        ringkasanTemuan: {
          criticalGaps: [],
          questionsToAsk: [],
          requirementsToAdd: [],
          totalNewFindings: 123,
        },
        journeyMap: null,
      },
      brdText
    )

    expect(result.gapCards).toHaveLength(10)
    expect(result.gapCards[0].brdReference).toBe('User klik Submit')
    expect(result.gapCards[1].brdReference).toBeNull()
    expect(result.gapCards[0].category.toLowerCase()).not.toContain('technical')
    expect(result.gapCards[0].category.toLowerCase()).not.toContain('blindspot')
    expect(result.gapCards[0].id).not.toBe(result.gapCards[1].id)
    expect(result.readinessScore).toBe(61)
    expect(result.readinessLabel).toBe('Perlu Klarifikasi')
    expect(result.ringkasanTemuan.totalNewFindings).toBe(
      result.gapCards.filter((card) => card.source === 'storyforge').length
    )
    expect(result.gapList).toHaveLength(10)
    expect(result.clarificationQuestions).toHaveLength(10)
    expect(result.scoreComponents.topActions.length).toBeGreaterThan(0)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('skips gap cards that miss any required user-facing field', () => {
    const { result } = validateAndNormalize(
      {
        gapCards: [
          makeCard({ kenapaPenting: '' }),
          makeCard({ id: 'complete' }),
        ],
        scoreComponents,
        readinessScore: 62,
        readinessLabel: 'Perlu Klarifikasi',
        journeyMap: null,
      },
      'User klik Submit'
    )

    expect(result.gapCards).toHaveLength(1)
    expect(result.gapCards[0].id).toBe('complete')
  })
})
