import { describe, it, expect } from 'vitest'
import {
  formatAllQuestions,
  formatAllRequirements,
  formatAnalysisReviewText,
  formatGapCardText,
} from '@/lib/analysis/copy-formatter'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'
import type { GapCard } from '@/types/analysis-v2'

function makeGapCard(overrides: Partial<GapCard> = {}): GapCard {
  return {
    id: 'card-1',
    yangBelumJelas: 'Belum jelas apa yang terjadi saat user klik dua kali.',
    kenapaPenting: 'Bisa menyebabkan duplikasi transaksi.',
    pertanyaanUntukTim: 'Apa yang terjadi kalau user klik tombol bayar dua kali?',
    usulanRequirement: 'Sistem harus men-disable tombol submit setelah klik pertama.',
    category: 'Aksi ganda',
    severity: 'high',
    source: 'storyforge',
    brdReference: null,
    ...overrides,
  }
}

describe('formatAllQuestions', () => {
  it('returns empty string for empty array', () => {
    expect(formatAllQuestions([])).toBe('')
  })

  it('formats single card as numbered list', () => {
    const cards = [makeGapCard()]
    const result = formatAllQuestions(cards)
    expect(result).toBe('1. Apa yang terjadi kalau user klik tombol bayar dua kali?')
  })

  it('formats multiple cards as numbered list', () => {
    const cards = [
      makeGapCard({ pertanyaanUntukTim: 'Pertanyaan pertama?' }),
      makeGapCard({ id: 'card-2', pertanyaanUntukTim: 'Pertanyaan kedua?' }),
      makeGapCard({ id: 'card-3', pertanyaanUntukTim: 'Pertanyaan ketiga?' }),
    ]
    const result = formatAllQuestions(cards)
    expect(result).toBe(
      '1. Pertanyaan pertama?\n2. Pertanyaan kedua?\n3. Pertanyaan ketiga?'
    )
  })

  it('produces plain text without HTML, Markdown, or JSON', () => {
    const cards = [
      makeGapCard({ pertanyaanUntukTim: 'Bagaimana handling error?' }),
      makeGapCard({ id: 'card-2', pertanyaanUntukTim: 'Apa timeout-nya?' }),
    ]
    const result = formatAllQuestions(cards)
    // No HTML tags
    expect(result).not.toMatch(/<[^>]+>/)
    // No Markdown formatting
    expect(result).not.toMatch(/[*_`#]/)
    // No JSON syntax
    expect(result).not.toMatch(/[{}[\]]/)
  })
})

describe('formatAllRequirements', () => {
  it('returns empty string for empty array', () => {
    expect(formatAllRequirements([])).toBe('')
  })

  it('formats single card as bullet list', () => {
    const cards = [makeGapCard()]
    const result = formatAllRequirements(cards)
    expect(result).toBe('• Sistem harus men-disable tombol submit setelah klik pertama.')
  })

  it('formats multiple cards as bullet list', () => {
    const cards = [
      makeGapCard({ usulanRequirement: 'Requirement satu.' }),
      makeGapCard({ id: 'card-2', usulanRequirement: 'Requirement dua.' }),
      makeGapCard({ id: 'card-3', usulanRequirement: 'Requirement tiga.' }),
    ]
    const result = formatAllRequirements(cards)
    expect(result).toBe(
      '• Requirement satu.\n• Requirement dua.\n• Requirement tiga.'
    )
  })

  it('produces plain text without HTML, Markdown, or JSON', () => {
    const cards = [
      makeGapCard({ usulanRequirement: 'Sistem harus retry otomatis.' }),
      makeGapCard({ id: 'card-2', usulanRequirement: 'Timeout max 30 detik.' }),
    ]
    const result = formatAllRequirements(cards)
    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).not.toMatch(/[*_`#]/)
    expect(result).not.toMatch(/[{}[\]]/)
  })
})

describe('formatGapCardText', () => {
  it('formats a card with all 4 labeled fields', () => {
    const card = makeGapCard()
    const result = formatGapCardText(card)
    expect(result).toBe(
      'Yang belum jelas: Belum jelas apa yang terjadi saat user klik dua kali.\n' +
      'Kenapa penting: Bisa menyebabkan duplikasi transaksi.\n' +
      'Pertanyaan untuk tim: Apa yang terjadi kalau user klik tombol bayar dua kali?\n' +
      'Usulan requirement: Sistem harus men-disable tombol submit setelah klik pertama.'
    )
  })

  it('uses labels from GAP_CARD_LABELS constants', () => {
    const card = makeGapCard()
    const result = formatGapCardText(card)
    expect(result).toContain('Yang belum jelas:')
    expect(result).toContain('Kenapa penting:')
    expect(result).toContain('Pertanyaan untuk tim:')
    expect(result).toContain('Usulan requirement:')
  })

  it('produces plain text without HTML, Markdown, or JSON', () => {
    const card = makeGapCard()
    const result = formatGapCardText(card)
    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).not.toMatch(/[*_`#]/)
    expect(result).not.toMatch(/[{}[\]]/)
  })

  it('contains exactly 4 lines (one per field)', () => {
    const card = makeGapCard()
    const result = formatGapCardText(card)
    const lines = result.split('\n')
    expect(lines).toHaveLength(4)
  })
})

describe('formatAnalysisReviewText', () => {
  it('formats a full v2 review as PM-readable plain text, not raw JSON', () => {
    const card = makeGapCard()
    const result: EnhancedAnalysisResult = {
      gapList: [{ category: card.category, description: card.yangBelumJelas, severity: card.severity }],
      clarificationQuestions: [card.pertanyaanUntukTim],
      readinessScore: 76,
      readinessLabel: 'Perlu Klarifikasi',
      scoreComponents: {
        kelengkapanAlur: { score: 80, explanation: 'Alur cukup jelas.' },
        kesiapanSprint: { score: 70, explanation: 'Masih ada pertanyaan.' },
        kejelasanRequirement: { score: 75, explanation: 'Requirement cukup jelas.' },
        konteksBisnis: { score: 80, explanation: 'Konteks cukup.' },
        topActions: ['Lengkapi perilaku klik dua kali.'],
      },
      ringkasanTemuan: {
        criticalGaps: [{ text: card.yangBelumJelas, severity: card.severity, source: card.source }],
        questionsToAsk: [{ text: card.pertanyaanUntukTim, severity: card.severity, source: card.source }],
        requirementsToAdd: [{ text: card.usulanRequirement, severity: card.severity, source: card.source }],
        totalNewFindings: 1,
      },
      gapCards: [card],
      journeyMap: null,
      version: 2,
    }

    const text = formatAnalysisReviewText(result)

    expect(text).toContain('Hasil Review BRD')
    expect(text).toContain('Readiness Score: 76/100')
    expect(text).toContain('Risiko utama')
    expect(text).toContain(card.pertanyaanUntukTim)
    expect(text).toContain(card.usulanRequirement)
    expect(text).not.toMatch(/[{}[\]"]/)
    expect(text).not.toContain('gapCards')
    expect(text).not.toContain('scoreComponents')
  })
})
