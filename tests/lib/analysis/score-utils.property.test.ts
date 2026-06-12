import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { ScoreComponents, ComponentScore } from '@/types/analysis-v2'
import { computeReadinessScore, getScoreLabel, computeTopActions } from '@/lib/analysis/score-utils'
import { SCORE_WEIGHTS } from '@/lib/analysis/constants'

// ─── Arbitraries (Generators) ────────────────────────────────────────────────

/** Generate a non-empty string (for explanation fields) */
const arbNonEmptyString = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0)

/** Generate a ComponentScore with score 0-100 and non-empty explanation */
const arbComponentScore: fc.Arbitrary<ComponentScore> = fc.record({
  score: fc.integer({ min: 0, max: 100 }),
  explanation: arbNonEmptyString,
})

/** Generate valid ScoreComponents with all four component scores and topActions */
const arbScoreComponents: fc.Arbitrary<ScoreComponents> = fc.record({
  kelengkapanAlur: arbComponentScore,
  kesiapanSprint: arbComponentScore,
  kejelasanRequirement: arbComponentScore,
  konteksBisnis: arbComponentScore,
  topActions: fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
})

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prd-refinement, Property 6: Score Computation Correctness', () => {
  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any EnhancedAnalysisResult, the readinessScore SHALL equal
   * round(0.30 * kelengkapanAlur.score + 0.25 * kesiapanSprint.score +
   * 0.25 * kejelasanRequirement.score + 0.20 * konteksBisnis.score)
   * (within ±1 for rounding), and each component's explanation SHALL be
   * a non-empty string.
   */
  it('readinessScore equals weighted sum within ±1 and all explanations are non-empty', () => {
    fc.assert(
      fc.property(arbScoreComponents, (components: ScoreComponents) => {
        const actualScore = computeReadinessScore(components)

        // Compute expected weighted sum
        const expectedWeighted =
          SCORE_WEIGHTS.kelengkapanAlur * components.kelengkapanAlur.score +
          SCORE_WEIGHTS.kesiapanSprint * components.kesiapanSprint.score +
          SCORE_WEIGHTS.kejelasanRequirement * components.kejelasanRequirement.score +
          SCORE_WEIGHTS.konteksBisnis * components.konteksBisnis.score

        const expectedScore = Math.round(expectedWeighted)

        // Score must match within ±1 (rounding tolerance)
        expect(Math.abs(actualScore - expectedScore)).toBeLessThanOrEqual(1)

        // Score must be in valid range 0-100
        expect(actualScore).toBeGreaterThanOrEqual(0)
        expect(actualScore).toBeLessThanOrEqual(100)

        // Each component explanation must be a non-empty string
        expect(components.kelengkapanAlur.explanation.trim().length).toBeGreaterThan(0)
        expect(components.kesiapanSprint.explanation.trim().length).toBeGreaterThan(0)
        expect(components.kejelasanRequirement.explanation.trim().length).toBeGreaterThan(0)
        expect(components.konteksBisnis.explanation.trim().length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 7: Score Label Correctness', () => {
  /**
   * **Validates: Requirements 7.4**
   *
   * For any readinessScore in range 0-100, the readinessLabel SHALL be
   * "Siap" if score >= 80, "Perlu Klarifikasi" if score >= 50 and < 80,
   * and "Tidak Siap" if score < 50.
   */
  it('correct label at all score ranges 0-100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score: number) => {
        const label = getScoreLabel(score)

        if (score >= 80) {
          expect(label).toBe('Siap')
        } else if (score >= 50) {
          expect(label).toBe('Perlu Klarifikasi')
        } else {
          expect(label).toBe('Tidak Siap')
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 8: Top Actions Conditional Presence', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * For any EnhancedAnalysisResult where readinessScore < 80, the
   * scoreComponents.topActions SHALL contain between 1 and 3 non-empty
   * strings. When readinessScore >= 80, topActions MAY be empty.
   */
  it('1-3 non-empty strings when score < 80, may be empty when >= 80', () => {
    fc.assert(
      fc.property(arbScoreComponents, (components: ScoreComponents) => {
        const score = computeReadinessScore(components)
        const topActions = computeTopActions(components, score)

        if (score < 80) {
          // Must have between 1 and 3 actions
          expect(topActions.length).toBeGreaterThanOrEqual(1)
          expect(topActions.length).toBeLessThanOrEqual(3)

          // Each action must be a non-empty string
          for (const action of topActions) {
            expect(typeof action).toBe('string')
            expect(action.trim().length).toBeGreaterThan(0)
          }
        } else {
          // When score >= 80, topActions may be empty (but still valid array)
          expect(Array.isArray(topActions)).toBe(true)
          expect(topActions.length).toBeLessThanOrEqual(3)
        }
      }),
      { numRuns: 100 }
    )
  })
})
