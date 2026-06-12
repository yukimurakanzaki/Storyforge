import type { GapCard, RingkasanTemuan, SummaryItem } from '@/types/analysis-v2'
import {
  SEVERITY_ORDER,
  SUMMARY_MAX_ITEMS_PER_CATEGORY,
  TOTAL_NEW_FINDINGS_SOURCE,
} from '@/lib/analysis/constants'

/**
 * Sorts gap cards by severity (high > medium > low), then by source (storyforge first as tiebreaker).
 * Returns a new sorted array without mutating the input.
 */
function sortBySeverityAndSource(cards: GapCard[]): GapCard[] {
  return [...cards].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
    if (severityDiff !== 0) return severityDiff

    // Tiebreaker: storyforge source comes first
    if (a.source === TOTAL_NEW_FINDINGS_SOURCE && b.source !== TOTAL_NEW_FINDINGS_SOURCE) return -1
    if (b.source === TOTAL_NEW_FINDINGS_SOURCE && a.source !== TOTAL_NEW_FINDINGS_SOURCE) return 1

    return 0
  })
}

/**
 * Maps a GapCard to a SummaryItem using the specified text field.
 */
function toSummaryItem(card: GapCard, textField: keyof GapCard): SummaryItem {
  return {
    text: card[textField] as string,
    severity: card.severity,
    source: card.source,
  }
}

/**
 * Selects the top summary items from gap cards for the RingkasanTemuan.
 *
 * Selection logic:
 * - Sort all gap cards by severity (high > medium > low), then by source (storyforge first)
 * - Take at most `maxPerCategory` items per category (default: 5)
 * - Each gap card contributes to all three categories:
 *   - yangBelumJelas → criticalGaps (labeled "Risiko utama" in UI)
 *   - pertanyaanUntukTim → questionsToAsk
 *   - usulanRequirement → requirementsToAdd
 * - totalNewFindings = count of ALL gapCards where source === 'storyforge'
 *
 * @param gapCards - All gap cards from the analysis
 * @param maxPerCategory - Maximum items per summary category (default: SUMMARY_MAX_ITEMS_PER_CATEGORY = 5)
 * @returns RingkasanTemuan with prioritized summary items
 */
export function selectSummaryItems(
  gapCards: GapCard[],
  maxPerCategory: number = SUMMARY_MAX_ITEMS_PER_CATEGORY
): RingkasanTemuan {
  // Sort cards by severity and source
  const sorted = sortBySeverityAndSource(gapCards)

  // Take at most maxPerCategory items (no padding with low-priority items)
  const selected = sorted.slice(0, maxPerCategory)

  // Map selected cards to summary items for each category
  const criticalGaps: SummaryItem[] = selected.map((card) =>
    toSummaryItem(card, 'yangBelumJelas')
  )

  const questionsToAsk: SummaryItem[] = selected.map((card) =>
    toSummaryItem(card, 'pertanyaanUntukTim')
  )

  const requirementsToAdd: SummaryItem[] = selected.map((card) =>
    toSummaryItem(card, 'usulanRequirement')
  )

  // Compute totalNewFindings from ALL gapCards (not just selected summary items)
  const totalNewFindings = gapCards.filter(
    (card) => card.source === TOTAL_NEW_FINDINGS_SOURCE
  ).length

  return {
    criticalGaps,
    questionsToAsk,
    requirementsToAdd,
    totalNewFindings,
  }
}
