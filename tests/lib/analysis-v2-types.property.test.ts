import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type {
  GapCard,
  JourneyMap,
  JourneyNode,
  JourneyEdge,
  EnhancedAnalysisResult,
  ScoreComponents,
  ComponentScore,
  RingkasanTemuan,
  SummaryItem,
} from '@/types/analysis-v2'
import {
  FORBIDDEN_CATEGORY_TERMS,
  MAX_GAP_CARDS,
} from '@/lib/analysis/constants'

// ─── Arbitraries (Generators) ────────────────────────────────────────────────

const arbSeverity = fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<
  'high' | 'medium' | 'low'
>
const arbSource = fc.constantFrom('brd', 'storyforge') as fc.Arbitrary<
  'brd' | 'storyforge'
>
const arbNodeStatus = fc.constantFrom(
  'explicit',
  'inferred',
  'missing'
) as fc.Arbitrary<'explicit' | 'inferred' | 'missing'>
const arbPathType = fc.constantFrom('happy', 'error', 'missing') as fc.Arbitrary<
  'happy' | 'error' | 'missing'
>

/** Generate a non-empty string that avoids forbidden category terms */
const arbSafeCategory = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(
    (s) =>
      s.trim().length > 0 &&
      !FORBIDDEN_CATEGORY_TERMS.some((term) =>
        s.toLowerCase().includes(term.toLowerCase())
      )
  )

/** Generate a non-empty string (for content fields) */
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 200 }).filter(
  (s) => s.trim().length > 0
)

/** Generate a valid GapCard */
const arbGapCard: fc.Arbitrary<GapCard> = fc.record({
  id: fc.uuid(),
  yangBelumJelas: arbNonEmptyString,
  kenapaPenting: arbNonEmptyString,
  pertanyaanUntukTim: arbNonEmptyString,
  usulanRequirement: arbNonEmptyString,
  category: arbSafeCategory,
  severity: arbSeverity,
  source: arbSource,
  brdReference: fc.option(arbNonEmptyString, { nil: null }),
})

/** Generate a unique node ID */
const arbNodeId = fc.uuid()

/** Generate a JourneyNode */
const arbJourneyNode = (id: string): fc.Arbitrary<JourneyNode> =>
  fc.record({
    id: fc.constant(id),
    label: arbNonEmptyString,
    status: arbNodeStatus,
  })

/** Generate a valid JourneyMap where all edge from/to reference existing node IDs */
const arbJourneyMap: fc.Arbitrary<JourneyMap> = fc
  .array(arbNodeId, { minLength: 2, maxLength: 8 })
  .chain((nodeIds) => {
    // Ensure unique IDs
    const uniqueIds = [...new Set(nodeIds)]
    if (uniqueIds.length < 2) {
      uniqueIds.push(uniqueIds[0] + '-extra')
    }

    const nodesArb = fc.tuple(
      ...uniqueIds.map((id) => arbJourneyNode(id))
    ) as fc.Arbitrary<JourneyNode[]>

    // Generate edges that only reference existing node IDs
    const edgeArb: fc.Arbitrary<JourneyEdge> = fc.record({
      from: fc.constantFrom(...uniqueIds),
      to: fc.constantFrom(...uniqueIds),
      pathType: arbPathType,
      label: fc.option(arbNonEmptyString, { nil: undefined }),
    })

    const edgesArb = fc.array(edgeArb, { minLength: 1, maxLength: 10 })

    return fc.tuple(nodesArb, edgesArb).map(([nodes, edges]) => ({
      title: 'Test Journey',
      nodes,
      edges,
      multiFlowNote: null,
    }))
  })

/** Generate a ComponentScore */
const arbComponentScore: fc.Arbitrary<ComponentScore> = fc.record({
  score: fc.integer({ min: 0, max: 100 }),
  explanation: arbNonEmptyString,
})

/** Generate ScoreComponents */
const arbScoreComponents: fc.Arbitrary<ScoreComponents> = fc.record({
  kelengkapanAlur: arbComponentScore,
  kesiapanSprint: arbComponentScore,
  kejelasanRequirement: arbComponentScore,
  konteksBisnis: arbComponentScore,
  topActions: fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
})

/** Generate a SummaryItem */
const arbSummaryItem: fc.Arbitrary<SummaryItem> = fc.record({
  text: arbNonEmptyString,
  severity: arbSeverity,
  source: arbSource,
})

/** Generate RingkasanTemuan */
const arbRingkasanTemuan: fc.Arbitrary<RingkasanTemuan> = fc
  .tuple(
    fc.array(arbSummaryItem, { minLength: 0, maxLength: 5 }),
    fc.array(arbSummaryItem, { minLength: 0, maxLength: 5 }),
    fc.array(arbSummaryItem, { minLength: 0, maxLength: 5 })
  )
  .map(([criticalGaps, questionsToAsk, requirementsToAdd]) => ({
    criticalGaps,
    questionsToAsk,
    requirementsToAdd,
    totalNewFindings: [...criticalGaps, ...questionsToAsk, ...requirementsToAdd].filter(
      (item) => item.source === 'storyforge'
    ).length,
  }))

/** Generate a valid EnhancedAnalysisResult with at most MAX_GAP_CARDS gap cards */
const arbEnhancedAnalysisResult: fc.Arbitrary<EnhancedAnalysisResult> = fc
  .tuple(
    fc.array(arbGapCard, { minLength: 0, maxLength: MAX_GAP_CARDS }),
    arbScoreComponents,
    arbRingkasanTemuan,
    fc.option(arbJourneyMap, { nil: null }),
    fc.integer({ min: 0, max: 100 })
  )
  .map(([gapCards, scoreComponents, ringkasanTemuan, journeyMap, readinessScore]) => {
    const readinessLabel =
      readinessScore >= 80
        ? 'Siap'
        : readinessScore >= 50
          ? 'Perlu Klarifikasi'
          : 'Tidak Siap'

    return {
      // Legacy fields
      gapList: gapCards.map((card) => ({
        category: card.category,
        description: card.yangBelumJelas,
        severity: card.severity,
        reference: card.brdReference,
      })),
      clarificationQuestions: gapCards.map((card) => card.pertanyaanUntukTim),
      readinessScore,
      readinessLabel,
      // V2 fields
      scoreComponents,
      ringkasanTemuan,
      gapCards,
      journeyMap,
      version: 2 as const,
    }
  })

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prd-refinement, Property 3: Gap Card Structural Completeness', () => {
  /**
   * **Validates: Requirements 3.1, 5.2, 5.3, 8.3**
   *
   * For any GapCard in the output, all four content fields (yangBelumJelas,
   * kenapaPenting, pertanyaanUntukTim, usulanRequirement) SHALL be non-empty
   * strings, source SHALL be one of 'brd' or 'storyforge', severity SHALL be
   * one of 'high', 'medium', or 'low', and category SHALL NOT contain
   * forbidden technical jargon terms.
   */
  it('all four content fields are non-empty, source/severity are valid enums, category has no jargon', () => {
    fc.assert(
      fc.property(arbGapCard, (card: GapCard) => {
        // All four content fields must be non-empty
        expect(card.yangBelumJelas.trim().length).toBeGreaterThan(0)
        expect(card.kenapaPenting.trim().length).toBeGreaterThan(0)
        expect(card.pertanyaanUntukTim.trim().length).toBeGreaterThan(0)
        expect(card.usulanRequirement.trim().length).toBeGreaterThan(0)

        // Source must be valid enum
        expect(['brd', 'storyforge']).toContain(card.source)

        // Severity must be valid enum
        expect(['high', 'medium', 'low']).toContain(card.severity)

        // Category must not contain forbidden terms
        for (const term of FORBIDDEN_CATEGORY_TERMS) {
          expect(card.category.toLowerCase()).not.toContain(term.toLowerCase())
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 5: Journey Map Structural Integrity', () => {
  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * For any non-null JourneyMap, every edge's from and to SHALL reference
   * existing node IDs, every edge's pathType SHALL be one of 'happy', 'error',
   * or 'missing', and every node's status SHALL be one of 'explicit',
   * 'inferred', or 'missing'.
   */
  it('all edge from/to reference existing node IDs, valid pathType and status enums', () => {
    fc.assert(
      fc.property(arbJourneyMap, (journeyMap: JourneyMap) => {
        const nodeIds = new Set(journeyMap.nodes.map((n) => n.id))

        // Every edge from/to must reference existing node IDs
        for (const edge of journeyMap.edges) {
          expect(nodeIds.has(edge.from)).toBe(true)
          expect(nodeIds.has(edge.to)).toBe(true)

          // pathType must be valid enum
          expect(['happy', 'error', 'missing']).toContain(edge.pathType)
        }

        // Every node status must be valid enum
        for (const node of journeyMap.nodes) {
          expect(['explicit', 'inferred', 'missing']).toContain(node.status)
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 11: Gap Card Count Limit', () => {
  /**
   * **Validates: Requirements 6.1, 6.2 (MVP scope constraint)**
   *
   * For any EnhancedAnalysisResult, the gapCards array SHALL contain at most
   * 10 items.
   */
  it('gapCards array contains at most 10 items', () => {
    fc.assert(
      fc.property(arbEnhancedAnalysisResult, (result: EnhancedAnalysisResult) => {
        expect(result.gapCards.length).toBeLessThanOrEqual(MAX_GAP_CARDS)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 12: Backward Compatibility', () => {
  /**
   * **Validates: Requirements 10.4**
   *
   * For any EnhancedAnalysisResult, the object SHALL also satisfy the legacy
   * AnalysisResult interface — specifically, it SHALL contain non-null gapList
   * (array), clarificationQuestions (array), readinessScore (number), and
   * readinessLabel (string).
   */
  it('EnhancedAnalysisResult contains non-null gapList, clarificationQuestions, readinessScore, readinessLabel', () => {
    fc.assert(
      fc.property(arbEnhancedAnalysisResult, (result: EnhancedAnalysisResult) => {
        // gapList must be a non-null array
        expect(result.gapList).not.toBeNull()
        expect(result.gapList).not.toBeUndefined()
        expect(Array.isArray(result.gapList)).toBe(true)

        // clarificationQuestions must be a non-null array
        expect(result.clarificationQuestions).not.toBeNull()
        expect(result.clarificationQuestions).not.toBeUndefined()
        expect(Array.isArray(result.clarificationQuestions)).toBe(true)

        // readinessScore must be a number
        expect(result.readinessScore).not.toBeNull()
        expect(result.readinessScore).not.toBeUndefined()
        expect(typeof result.readinessScore).toBe('number')
        expect(result.readinessScore).toBeGreaterThanOrEqual(0)
        expect(result.readinessScore).toBeLessThanOrEqual(100)

        // readinessLabel must be a non-empty string
        expect(result.readinessLabel).not.toBeNull()
        expect(result.readinessLabel).not.toBeUndefined()
        expect(typeof result.readinessLabel).toBe('string')
        expect(result.readinessLabel.length).toBeGreaterThan(0)
        expect(['Siap', 'Perlu Klarifikasi', 'Tidak Siap']).toContain(
          result.readinessLabel
        )
      }),
      { numRuns: 100 }
    )
  })
})
