import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { GapCard } from '@/types/analysis-v2'
import { selectSummaryItems } from '@/lib/analysis/summary-selector'
import {
  SEVERITY_ORDER,
  SUMMARY_MAX_ITEMS_PER_CATEGORY,
} from '@/lib/analysis/constants'

// ─── Arbitraries (Generators) ────────────────────────────────────────────────

const arbSeverity = fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<
  'high' | 'medium' | 'low'
>

const arbSource = fc.constantFrom('brd', 'storyforge') as fc.Arbitrary<
  'brd' | 'storyforge'
>

const arbNonEmptyString = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)

const arbGapCard: fc.Arbitrary<GapCard> = fc.record({
  id: fc.uuid(),
  yangBelumJelas: arbNonEmptyString,
  kenapaPenting: arbNonEmptyString,
  pertanyaanUntukTim: arbNonEmptyString,
  usulanRequirement: arbNonEmptyString,
  category: arbNonEmptyString,
  severity: arbSeverity,
  source: arbSource,
  brdReference: fc.option(arbNonEmptyString, { nil: null }),
})

/** Generate arrays of gap cards with 0-15 items to test boundary behavior */
const arbGapCardArray = fc.array(arbGapCard, { minLength: 0, maxLength: 15 })

/** Generate arrays with mixed severities to ensure prioritization testing */
const arbMixedSeverityCards = fc
  .array(arbGapCard, { minLength: 2, maxLength: 15 })
  .filter((cards) => {
    const severities = new Set(cards.map((c) => c.severity))
    return severities.size >= 2
  })

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prd-refinement, Property 1: Summary Size Constraint', () => {
  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * For any EnhancedAnalysisResult, the ringkasanTemuan SHALL contain at most
   * 5 items in criticalGaps, at most 5 in questionsToAsk, and at most 5 in
   * requirementsToAdd — and the count in each category SHALL equal the minimum
   * of 5 and the number of available items (no padding).
   */
  it('each summary category has at most 5 items and count equals min(5, available)', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const result = selectSummaryItems(gapCards, SUMMARY_MAX_ITEMS_PER_CATEGORY)

        const expectedCount = Math.min(SUMMARY_MAX_ITEMS_PER_CATEGORY, gapCards.length)

        // At most 5 items per category
        expect(result.criticalGaps.length).toBeLessThanOrEqual(
          SUMMARY_MAX_ITEMS_PER_CATEGORY
        )
        expect(result.questionsToAsk.length).toBeLessThanOrEqual(
          SUMMARY_MAX_ITEMS_PER_CATEGORY
        )
        expect(result.requirementsToAdd.length).toBeLessThanOrEqual(
          SUMMARY_MAX_ITEMS_PER_CATEGORY
        )

        // Count equals min(5, available) — no padding
        expect(result.criticalGaps.length).toBe(expectedCount)
        expect(result.questionsToAsk.length).toBe(expectedCount)
        expect(result.requirementsToAdd.length).toBe(expectedCount)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 2: Summary Prioritization by Severity', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any list of gap cards with mixed severities, the summary selection
   * function SHALL choose items such that no excluded item has higher severity
   * than any included item. Formally: for every item in the summary and every
   * item NOT in the summary, included.severity >= excluded.severity in the
   * ordering high > medium > low.
   */
  it('no excluded item has higher severity than any included item', () => {
    fc.assert(
      fc.property(arbMixedSeverityCards, (gapCards: GapCard[]) => {
        const result = selectSummaryItems(gapCards, SUMMARY_MAX_ITEMS_PER_CATEGORY)

        // If all cards fit in the summary, there are no excluded items
        if (gapCards.length <= SUMMARY_MAX_ITEMS_PER_CATEGORY) {
          return
        }

        // The summary items come from the top-N sorted cards.
        // We verify via the severity of included vs excluded items.
        // Since all three categories are derived from the same selected cards,
        // we can check using criticalGaps (which maps to yangBelumJelas).
        const includedSeverities = result.criticalGaps.map((item) => item.severity)

        // Find the minimum severity among included items
        const minIncludedSeverityRank = Math.min(
          ...includedSeverities.map((s) => SEVERITY_ORDER[s])
        )

        // Determine which cards were excluded (not in the top-N selection)
        // The selection takes the first maxPerCategory items after sorting by severity desc
        // So excluded cards are those beyond the first maxPerCategory after sorting
        const sorted = [...gapCards].sort(
          (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
        )
        const excludedCards = sorted.slice(SUMMARY_MAX_ITEMS_PER_CATEGORY)

        // No excluded card should have higher severity than the minimum included severity
        for (const excluded of excludedCards) {
          expect(SEVERITY_ORDER[excluded.severity]).toBeLessThanOrEqual(
            minIncludedSeverityRank
          )
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 9: Total New Findings Count Accuracy', () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * For any RingkasanTemuan, the totalNewFindings SHALL equal the count of ALL
   * gapCards (not just summary items) where source === 'storyforge'.
   */
  it('totalNewFindings equals count of ALL gapCards with source === storyforge', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const result = selectSummaryItems(gapCards, SUMMARY_MAX_ITEMS_PER_CATEGORY)

        // Count ALL gapCards where source === 'storyforge' (not just summary items)
        const expectedCount = gapCards.filter(
          (card) => card.source === 'storyforge'
        ).length

        expect(result.totalNewFindings).toBe(expectedCount)
      }),
      { numRuns: 100 }
    )
  })
})
