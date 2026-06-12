import type {
  EnhancedAnalysisResult,
  GapCard,
  ScoreComponents,
  ComponentScore,
  RingkasanTemuan,
  JourneyMap,
} from '@/types/analysis-v2'
import type { GapItem } from '@/types/index'
import { computeReadinessScore, computeTopActions, getScoreLabel } from '@/lib/analysis/score-utils'
import { selectSummaryItems } from '@/lib/analysis/summary-selector'
import {
  MAX_GAP_CARDS,
  SUMMARY_MAX_ITEMS_PER_CATEGORY,
  FORBIDDEN_CATEGORY_TERMS,
} from '@/lib/analysis/constants'

/**
 * Validates and normalizes raw AI output into a well-formed EnhancedAnalysisResult.
 *
 * Server-side enforcement — does NOT rely on AI compliance:
 * - Truncates gapCards to max 10
 * - Truncates ringkasanTemuan arrays to max 5 each
 * - Validates brdReference is a substring of BRD text (nulls invalid ones)
 * - Recomputes readinessScore from component weights if mismatch > 1
 * - Recomputes readinessLabel from score value
 * - Strips forbidden technical jargon from category fields
 * - Populates legacy fields (gapList, clarificationQuestions) from gap cards
 * - Ensures all required fields present with sensible defaults
 *
 * @param raw - Raw AI output (unknown type)
 * @param brdText - Original BRD text for reference validation
 * @returns Validated result + any warnings generated during normalization
 */
export function validateAndNormalize(
  raw: unknown,
  brdText: string
): { result: EnhancedAnalysisResult; warnings: string[] } {
  const warnings: string[] = []
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  // 1. Parse and validate gap cards
  let gapCards = parseGapCards(obj.gapCards, warnings)

  // 2. Truncate gapCards to max 10
  if (gapCards.length > MAX_GAP_CARDS) {
    warnings.push(`gapCards truncated from ${gapCards.length} to ${MAX_GAP_CARDS}`)
    gapCards = gapCards.slice(0, MAX_GAP_CARDS)
  }

  // Ensure stable unique IDs after filtering/truncation. The model may omit or duplicate IDs.
  gapCards = ensureStableGapCardIds(gapCards)

  // 3. Validate brdReference is substring of brdText
  for (const card of gapCards) {
    if (card.brdReference !== null) {
      if (!brdText.includes(card.brdReference)) {
        warnings.push(
          `brdReference "${card.brdReference.slice(0, 50)}..." not found in BRD text, set to null`
        )
        card.brdReference = null
      }
    }
  }

  // 4. Strip forbidden terms from category fields
  for (const card of gapCards) {
    card.category = stripForbiddenTerms(card.category, warnings)
  }

  // 5. Parse and validate score components
  const scoreComponents = parseScoreComponents(obj.scoreComponents, warnings)

  // 6. Recompute score from components if mismatch > 1
  const computedScore = computeReadinessScore(scoreComponents)
  let readinessScore = parseNumber(obj.readinessScore, 0)

  if (Math.abs(readinessScore - computedScore) > 1) {
    warnings.push(
      `readinessScore mismatch: AI reported ${readinessScore}, computed ${computedScore}. Using computed value.`
    )
    readinessScore = computedScore
  }

  // Clamp score to 0-100
  readinessScore = Math.max(0, Math.min(100, readinessScore))

  // 7. Recompute label from score
  const computedLabel = getScoreLabel(readinessScore)
  const rawLabel = typeof obj.readinessLabel === 'string' ? obj.readinessLabel : ''
  if (rawLabel !== computedLabel) {
    if (rawLabel) {
      warnings.push(
        `readinessLabel mismatch: AI reported "${rawLabel}", computed "${computedLabel}". Using computed value.`
      )
    }
  }
  const readinessLabel = computedLabel

  scoreComponents.topActions = computeTopActions(scoreComponents, readinessScore)

  // 8. Parse or recompute ringkasanTemuan
  let ringkasanTemuan = parseRingkasanTemuan(obj.ringkasanTemuan, warnings)

  // Truncate ringkasanTemuan arrays to max 5 each
  if (ringkasanTemuan.criticalGaps.length > SUMMARY_MAX_ITEMS_PER_CATEGORY) {
    warnings.push(
      `ringkasanTemuan.criticalGaps truncated from ${ringkasanTemuan.criticalGaps.length} to ${SUMMARY_MAX_ITEMS_PER_CATEGORY}`
    )
    ringkasanTemuan.criticalGaps = ringkasanTemuan.criticalGaps.slice(
      0,
      SUMMARY_MAX_ITEMS_PER_CATEGORY
    )
  }
  if (ringkasanTemuan.questionsToAsk.length > SUMMARY_MAX_ITEMS_PER_CATEGORY) {
    warnings.push(
      `ringkasanTemuan.questionsToAsk truncated from ${ringkasanTemuan.questionsToAsk.length} to ${SUMMARY_MAX_ITEMS_PER_CATEGORY}`
    )
    ringkasanTemuan.questionsToAsk = ringkasanTemuan.questionsToAsk.slice(
      0,
      SUMMARY_MAX_ITEMS_PER_CATEGORY
    )
  }
  if (ringkasanTemuan.requirementsToAdd.length > SUMMARY_MAX_ITEMS_PER_CATEGORY) {
    warnings.push(
      `ringkasanTemuan.requirementsToAdd truncated from ${ringkasanTemuan.requirementsToAdd.length} to ${SUMMARY_MAX_ITEMS_PER_CATEGORY}`
    )
    ringkasanTemuan.requirementsToAdd = ringkasanTemuan.requirementsToAdd.slice(
      0,
      SUMMARY_MAX_ITEMS_PER_CATEGORY
    )
  }

  // If ringkasanTemuan was empty/invalid, regenerate from gap cards
  if (
    ringkasanTemuan.criticalGaps.length === 0 &&
    ringkasanTemuan.questionsToAsk.length === 0 &&
    ringkasanTemuan.requirementsToAdd.length === 0 &&
    gapCards.length > 0
  ) {
    warnings.push('ringkasanTemuan was empty, regenerated from gapCards using selectSummaryItems')
    ringkasanTemuan = selectSummaryItems(gapCards)
  }

  // totalNewFindings is an invariant: count ALL gapCards from the full analysis.
  const actualNewFindings = gapCards.filter((card) => card.source === 'storyforge').length
  if (ringkasanTemuan.totalNewFindings !== actualNewFindings) {
    warnings.push(
      `ringkasanTemuan.totalNewFindings mismatch: AI reported ${ringkasanTemuan.totalNewFindings}, computed ${actualNewFindings}. Using computed value.`
    )
    ringkasanTemuan.totalNewFindings = actualNewFindings
  }

  // 9. Parse journey map (nullable)
  const journeyMap = parseJourneyMap(obj.journeyMap, warnings)

  // 10. Generate legacy fields from gap cards for backward compatibility
  const gapList: GapItem[] = gapCards.map((card) => ({
    category: card.category,
    description: card.yangBelumJelas,
    severity: card.severity,
    reference: card.brdReference,
  }))

  const clarificationQuestions: string[] = gapCards.map((card) => card.pertanyaanUntukTim)

  // 11. Assemble final result
  const result: EnhancedAnalysisResult = {
    // Legacy fields
    gapList,
    clarificationQuestions,
    readinessScore,
    readinessLabel,

    // V2 fields
    scoreComponents,
    ringkasanTemuan,
    gapCards,
    journeyMap,
    version: 2,
  }

  return { result, warnings }
}

// ─── Helper: Parse Gap Cards ─────────────────────────────────────────────────

function parseGapCards(raw: unknown, warnings: string[]): GapCard[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined && raw !== null) {
      warnings.push('gapCards is not an array, defaulting to empty')
    }
    return []
  }

  return raw
    .map((item, index) => parseGapCard(item, index, warnings))
    .filter((card): card is GapCard => card !== null)
}

function parseGapCard(raw: unknown, index: number, warnings: string[]): GapCard | null {
  if (typeof raw !== 'object' || raw === null) {
    warnings.push(`gapCards[${index}] is not an object, skipped`)
    return null
  }

  const obj = raw as Record<string, unknown>

  const id = typeof obj.id === 'string' && obj.id.trim().length > 0 ? obj.id.trim() : `gap-${index + 1}`
  const yangBelumJelas = parseString(obj.yangBelumJelas, '').trim()
  const kenapaPenting = parseString(obj.kenapaPenting, '').trim()
  const pertanyaanUntukTim = parseString(obj.pertanyaanUntukTim, '').trim()
  const usulanRequirement = parseString(obj.usulanRequirement, '').trim()
  const category = parseString(obj.category, 'Umum')
  const severity = parseSeverity(obj.severity)
  const source = parseSource(obj.source)
  const brdReference =
    typeof obj.brdReference === 'string' && obj.brdReference.length > 0
      ? obj.brdReference
      : null

  // Gap Cards are only useful when all four user-facing fields exist.
  if (!yangBelumJelas || !kenapaPenting || !pertanyaanUntukTim || !usulanRequirement) {
    warnings.push(`gapCards[${index}] missing required content field(s), skipped`)
    return null
  }

  return {
    id,
    yangBelumJelas,
    kenapaPenting,
    pertanyaanUntukTim,
    usulanRequirement,
    category,
    severity,
    source,
    brdReference,
  }
}

function ensureStableGapCardIds(cards: GapCard[]): GapCard[] {
  const seen = new Set<string>()

  return cards.map((card, index) => {
    const rawId = card.id.trim()
    const normalized = rawId
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    let id = normalized || `gap-${index + 1}`
    if (seen.has(id)) {
      id = `${id}-${index + 1}`
    }
    seen.add(id)

    return { ...card, id }
  })
}

// ─── Helper: Parse Score Components ──────────────────────────────────────────

function parseScoreComponents(raw: unknown, warnings: string[]): ScoreComponents {
  const defaults: ScoreComponents = {
    kelengkapanAlur: { score: 0, explanation: '' },
    kesiapanSprint: { score: 0, explanation: '' },
    kejelasanRequirement: { score: 0, explanation: '' },
    konteksBisnis: { score: 0, explanation: '' },
    topActions: [],
  }

  if (typeof raw !== 'object' || raw === null) {
    if (raw !== undefined && raw !== null) {
      warnings.push('scoreComponents is not an object, using defaults (all scores 0)')
    } else {
      warnings.push('scoreComponents missing, using defaults (all scores 0)')
    }
    return defaults
  }

  const obj = raw as Record<string, unknown>

  return {
    kelengkapanAlur: parseComponentScore(obj.kelengkapanAlur, 'kelengkapanAlur', warnings),
    kesiapanSprint: parseComponentScore(obj.kesiapanSprint, 'kesiapanSprint', warnings),
    kejelasanRequirement: parseComponentScore(
      obj.kejelasanRequirement,
      'kejelasanRequirement',
      warnings
    ),
    konteksBisnis: parseComponentScore(obj.konteksBisnis, 'konteksBisnis', warnings),
    topActions: parseStringArray(obj.topActions, warnings, 'scoreComponents.topActions'),
  }
}

function parseComponentScore(
  raw: unknown,
  fieldName: string,
  warnings: string[]
): ComponentScore {
  if (typeof raw !== 'object' || raw === null) {
    warnings.push(`scoreComponents.${fieldName} missing or invalid, defaulting to score 0`)
    return { score: 0, explanation: '' }
  }

  const obj = raw as Record<string, unknown>
  const score = Math.max(0, Math.min(100, parseNumber(obj.score, 0)))
  const explanation = parseString(obj.explanation, '')

  return { score, explanation }
}

// ─── Helper: Parse RingkasanTemuan ───────────────────────────────────────────

function parseRingkasanTemuan(raw: unknown, warnings: string[]): RingkasanTemuan {
  const empty: RingkasanTemuan = {
    criticalGaps: [],
    questionsToAsk: [],
    requirementsToAdd: [],
    totalNewFindings: 0,
  }

  if (typeof raw !== 'object' || raw === null) {
    return empty
  }

  const obj = raw as Record<string, unknown>

  const criticalGaps = parseSummaryItems(obj.criticalGaps)
  const questionsToAsk = parseSummaryItems(obj.questionsToAsk)
  const requirementsToAdd = parseSummaryItems(obj.requirementsToAdd)
  const totalNewFindings = parseNumber(obj.totalNewFindings, 0)

  return { criticalGaps, questionsToAsk, requirementsToAdd, totalNewFindings }
}

function parseSummaryItems(raw: unknown): RingkasanTemuan['criticalGaps'] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        text: parseString(obj.text, ''),
        severity: parseSeverity(obj.severity),
        source: parseSource(obj.source),
      }
    })
    .filter((item) => item.text.length > 0)
}

// ─── Helper: Parse Journey Map ───────────────────────────────────────────────

function parseJourneyMap(raw: unknown, warnings: string[]): JourneyMap | null {
  if (raw === null || raw === undefined) {
    return null
  }

  if (typeof raw !== 'object') {
    warnings.push('journeyMap is not an object or null, set to null')
    return null
  }

  const obj = raw as Record<string, unknown>

  const title = parseString(obj.title, '')
  const nodes = parseJourneyNodes(obj.nodes)
  const edges = parseJourneyEdges(obj.edges, nodes)
  const multiFlowNote =
    typeof obj.multiFlowNote === 'string' && obj.multiFlowNote.length > 0
      ? obj.multiFlowNote
      : null

  // If no nodes, journey map is not useful
  if (nodes.length === 0) {
    warnings.push('journeyMap has no valid nodes, set to null')
    return null
  }

  return { title, nodes, edges, multiFlowNote }
}

function parseJourneyNodes(raw: unknown): JourneyMap['nodes'] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => {
      const obj = item as Record<string, unknown>
      const id = parseString(obj.id, '')
      const label = parseString(obj.label, '')
      const status = parseNodeStatus(obj.status)
      return { id, label, status }
    })
    .filter((node) => node.id.length > 0 && node.label.length > 0)
}

function parseJourneyEdges(
  raw: unknown,
  validNodes: JourneyMap['nodes']
): JourneyMap['edges'] {
  if (!Array.isArray(raw)) return []

  const nodeIds = new Set(validNodes.map((n) => n.id))

  return raw
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => {
      const obj = item as Record<string, unknown>
      const from = parseString(obj.from, '')
      const to = parseString(obj.to, '')
      const pathType = parsePathType(obj.pathType)
      const label =
        typeof obj.label === 'string' && obj.label.length > 0 ? obj.label : undefined
      return { from, to, pathType, label }
    })
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
}

// ─── Helper: Strip Forbidden Terms ───────────────────────────────────────────

function stripForbiddenTerms(category: string, warnings: string[]): string {
  let cleaned = category
  for (const term of FORBIDDEN_CATEGORY_TERMS) {
    const regex = new RegExp(term, 'gi')
    if (regex.test(cleaned)) {
      warnings.push(`Stripped forbidden term "${term}" from category "${category}"`)
      cleaned = cleaned.replace(regex, '').trim()
    }
  }

  // Clean up leftover punctuation/whitespace from stripping
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^[:\-–—,.\s]+|[:\-–—,.\s]+$/g, '').trim()

  // If category is now empty after stripping, use default
  if (cleaned.length === 0) {
    cleaned = 'Umum'
  }

  return cleaned
}

// ─── Primitive Parsers ───────────────────────────────────────────────────────

function parseString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  return fallback
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value
  return fallback
}

function parseSeverity(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'medium'
}

function parseSource(value: unknown): 'brd' | 'storyforge' {
  if (value === 'brd' || value === 'storyforge') return value
  return 'storyforge'
}

function parseNodeStatus(value: unknown): 'explicit' | 'inferred' | 'missing' {
  if (value === 'explicit' || value === 'inferred' || value === 'missing') return value
  return 'inferred'
}

function parsePathType(value: unknown): 'happy' | 'error' | 'missing' {
  if (value === 'happy' || value === 'error' || value === 'missing') return value
  return 'happy'
}

function parseStringArray(raw: unknown, warnings: string[], fieldName: string): string[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined && raw !== null) {
      warnings.push(`${fieldName} is not an array, defaulting to empty`)
    }
    return []
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.length > 0)
}
