import { describe, it, expect } from 'vitest'
import { selectSummaryItems } from '@/lib/analysis/summary-selector'
import type { GapCard } from '@/types/analysis-v2'

function makeGapCard(overrides: Partial<GapCard> = {}): GapCard {
  return {
    id: overrides.id ?? 'card-1',
    yangBelumJelas: overrides.yangBelumJelas ?? 'Yang belum jelas default',
    kenapaPenting: overrides.kenapaPenting ?? 'Kenapa penting default',
    pertanyaanUntukTim: overrides.pertanyaanUntukTim ?? 'Pertanyaan default',
    usulanRequirement: overrides.usulanRequirement ?? 'Usulan default',
    category: overrides.category ?? 'alur user',
    severity: overrides.severity ?? 'medium',
    source: overrides.source ?? 'storyforge',
    brdReference: overrides.brdReference ?? null,
  }
}

describe('selectSummaryItems', () => {
  it('returns empty arrays when no gap cards provided', () => {
    const result = selectSummaryItems([])

    expect(result.criticalGaps).toEqual([])
    expect(result.questionsToAsk).toEqual([])
    expect(result.requirementsToAdd).toEqual([])
    expect(result.totalNewFindings).toBe(0)
  })

  it('returns all items when fewer than maxPerCategory', () => {
    const cards = [
      makeGapCard({ id: '1', severity: 'high' }),
      makeGapCard({ id: '2', severity: 'medium' }),
    ]

    const result = selectSummaryItems(cards)

    expect(result.criticalGaps).toHaveLength(2)
    expect(result.questionsToAsk).toHaveLength(2)
    expect(result.requirementsToAdd).toHaveLength(2)
  })

  it('enforces max 5 items per category by default', () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makeGapCard({ id: `card-${i}`, severity: 'high' })
    )

    const result = selectSummaryItems(cards)

    expect(result.criticalGaps).toHaveLength(5)
    expect(result.questionsToAsk).toHaveLength(5)
    expect(result.requirementsToAdd).toHaveLength(5)
  })

  it('respects custom maxPerCategory', () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makeGapCard({ id: `card-${i}`, severity: 'high' })
    )

    const result = selectSummaryItems(cards, 3)

    expect(result.criticalGaps).toHaveLength(3)
    expect(result.questionsToAsk).toHaveLength(3)
    expect(result.requirementsToAdd).toHaveLength(3)
  })

  it('selects items by severity (high > medium > low)', () => {
    const cards = [
      makeGapCard({ id: '1', severity: 'low', yangBelumJelas: 'Low item' }),
      makeGapCard({ id: '2', severity: 'high', yangBelumJelas: 'High item' }),
      makeGapCard({ id: '3', severity: 'medium', yangBelumJelas: 'Medium item' }),
    ]

    const result = selectSummaryItems(cards, 2)

    // Should select high and medium, excluding low
    expect(result.criticalGaps[0].text).toBe('High item')
    expect(result.criticalGaps[1].text).toBe('Medium item')
  })

  it('uses source as tiebreaker (storyforge first)', () => {
    const cards = [
      makeGapCard({ id: '1', severity: 'high', source: 'brd', yangBelumJelas: 'BRD item' }),
      makeGapCard({ id: '2', severity: 'high', source: 'storyforge', yangBelumJelas: 'SF item' }),
    ]

    const result = selectSummaryItems(cards, 1)

    // storyforge should come first when severity is equal
    expect(result.criticalGaps[0].text).toBe('SF item')
  })

  it('maps yangBelumJelas to criticalGaps text', () => {
    const cards = [makeGapCard({ yangBelumJelas: 'Alur pembayaran belum jelas' })]

    const result = selectSummaryItems(cards)

    expect(result.criticalGaps[0].text).toBe('Alur pembayaran belum jelas')
  })

  it('maps pertanyaanUntukTim to questionsToAsk text', () => {
    const cards = [makeGapCard({ pertanyaanUntukTim: 'Apa yang terjadi kalau timeout?' })]

    const result = selectSummaryItems(cards)

    expect(result.questionsToAsk[0].text).toBe('Apa yang terjadi kalau timeout?')
  })

  it('maps usulanRequirement to requirementsToAdd text', () => {
    const cards = [makeGapCard({ usulanRequirement: 'Sistem harus menampilkan error message' })]

    const result = selectSummaryItems(cards)

    expect(result.requirementsToAdd[0].text).toBe('Sistem harus menampilkan error message')
  })

  it('computes totalNewFindings from ALL gapCards where source is storyforge', () => {
    const cards = [
      makeGapCard({ id: '1', source: 'storyforge' }),
      makeGapCard({ id: '2', source: 'brd' }),
      makeGapCard({ id: '3', source: 'storyforge' }),
      makeGapCard({ id: '4', source: 'storyforge' }),
      makeGapCard({ id: '5', source: 'brd' }),
      makeGapCard({ id: '6', source: 'storyforge' }),
      makeGapCard({ id: '7', source: 'storyforge' }),
      makeGapCard({ id: '8', source: 'storyforge' }),
    ]

    // Even with maxPerCategory=2, totalNewFindings counts ALL storyforge cards
    const result = selectSummaryItems(cards, 2)

    expect(result.totalNewFindings).toBe(6)
    expect(result.criticalGaps).toHaveLength(2) // Only 2 in summary
  })

  it('preserves severity and source in summary items', () => {
    const cards = [
      makeGapCard({ id: '1', severity: 'high', source: 'storyforge' }),
      makeGapCard({ id: '2', severity: 'low', source: 'brd' }),
    ]

    const result = selectSummaryItems(cards)

    expect(result.criticalGaps[0].severity).toBe('high')
    expect(result.criticalGaps[0].source).toBe('storyforge')
    expect(result.criticalGaps[1].severity).toBe('low')
    expect(result.criticalGaps[1].source).toBe('brd')
  })

  it('does not pad with low-priority items when fewer than max available', () => {
    const cards = [
      makeGapCard({ id: '1', severity: 'high' }),
      makeGapCard({ id: '2', severity: 'high' }),
    ]

    const result = selectSummaryItems(cards)

    // Only 2 items available, should not pad to 5
    expect(result.criticalGaps).toHaveLength(2)
    expect(result.questionsToAsk).toHaveLength(2)
    expect(result.requirementsToAdd).toHaveLength(2)
  })
})
