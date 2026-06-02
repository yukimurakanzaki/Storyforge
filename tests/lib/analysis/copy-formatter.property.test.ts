import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { GapCard } from '@/types/analysis-v2'
import {
  formatAllQuestions,
  formatAllRequirements,
  formatGapCardText,
} from '@/lib/analysis/copy-formatter'

// ─── Arbitraries (Generators) ────────────────────────────────────────────────

const arbSeverity = fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<
  'high' | 'medium' | 'low'
>
const arbSource = fc.constantFrom('brd', 'storyforge') as fc.Arbitrary<
  'brd' | 'storyforge'
>

/**
 * Generate clean content strings for gap card fields.
 * We avoid HTML, Markdown, and JSON characters in the INPUT because
 * we are testing the formatter's output format — not content passthrough.
 * Characters excluded: < > * _ ` # { } [ ] \n
 */
const CLEAN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.?!-()/'
const arbCleanString = fc
  .string({ minLength: 1, maxLength: 100, unit: fc.constantFrom(...CLEAN_CHARS.split('')) })
  .filter((s) => s.trim().length > 0)

/** Generate a safe category string (no forbidden terms) */
const CATEGORY_CHARS = 'abcdefghijklmnopqrstuvwxyz '
const arbSafeCategory = fc
  .string({ minLength: 3, maxLength: 30, unit: fc.constantFrom(...CATEGORY_CHARS.split('')) })
  .filter((s) => s.trim().length > 0)

/** Generate a valid GapCard with clean content (no HTML/Markdown/JSON in fields) */
const arbGapCard: fc.Arbitrary<GapCard> = fc.record({
  id: fc.uuid(),
  yangBelumJelas: arbCleanString,
  kenapaPenting: arbCleanString,
  pertanyaanUntukTim: arbCleanString,
  usulanRequirement: arbCleanString,
  category: arbSafeCategory,
  severity: arbSeverity,
  source: arbSource,
  brdReference: fc.option(arbCleanString, { nil: null }),
})

/** Generate a non-empty array of GapCards (1 to 10) */
const arbGapCardArray = fc.array(arbGapCard, { minLength: 1, maxLength: 10 })

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prd-refinement, Property 10: Copy Formatter Correctness', () => {
  /**
   * **Validates: Requirements 1.4, 9.1, 9.3, 9.4**
   *
   * For any non-empty array of GapCard objects, the "copy all questions"
   * formatter SHALL produce a numbered list containing exactly one line per
   * card matching its pertanyaanUntukTim field, and the "copy all requirements"
   * formatter SHALL produce a bullet list containing exactly one line per card
   * matching its usulanRequirement field.
   */
  it('formatAllQuestions produces exactly one numbered line per card matching pertanyaanUntukTim', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const output = formatAllQuestions(gapCards)
        const lines = output.split('\n')

        // Exactly one line per card
        expect(lines.length).toBe(gapCards.length)

        // Each line is numbered and contains the card's pertanyaanUntukTim
        for (let i = 0; i < gapCards.length; i++) {
          const expectedPrefix = `${i + 1}. `
          expect(lines[i].startsWith(expectedPrefix)).toBe(true)
          expect(lines[i]).toContain(gapCards[i].pertanyaanUntukTim)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('formatAllRequirements produces exactly one bullet line per card matching usulanRequirement', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const output = formatAllRequirements(gapCards)
        const lines = output.split('\n')

        // Exactly one line per card
        expect(lines.length).toBe(gapCards.length)

        // Each line starts with bullet and contains the card's usulanRequirement
        for (let i = 0; i < gapCards.length; i++) {
          expect(lines[i].startsWith('\u2022 ')).toBe(true)
          expect(lines[i]).toContain(gapCards[i].usulanRequirement)
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: prd-refinement, Property 13: Copy Output Plain Text Format', () => {
  /**
   * **Validates: Requirements 1.4, 9.1, 9.3, 9.4**
   *
   * For any output from the copy formatters or individual Gap Card copy,
   * the resulting string SHALL contain no HTML tags, no Markdown formatting
   * characters (**, __, `, #), and no JSON syntax ({, }, [, ]).
   */
  it('formatAllQuestions output contains no HTML, Markdown, or JSON syntax', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const output = formatAllQuestions(gapCards)

        // No HTML tags
        expect(output).not.toMatch(/<[^>]+>/)

        // No Markdown formatting characters
        expect(output).not.toContain('**')
        expect(output).not.toContain('__')
        expect(output).not.toContain('`')
        expect(output).not.toContain('#')

        // No JSON syntax
        expect(output).not.toContain('{')
        expect(output).not.toContain('}')
        expect(output).not.toContain('[')
        expect(output).not.toContain(']')
      }),
      { numRuns: 100 }
    )
  })

  it('formatAllRequirements output contains no HTML, Markdown, or JSON syntax', () => {
    fc.assert(
      fc.property(arbGapCardArray, (gapCards: GapCard[]) => {
        const output = formatAllRequirements(gapCards)

        // No HTML tags
        expect(output).not.toMatch(/<[^>]+>/)

        // No Markdown formatting characters
        expect(output).not.toContain('**')
        expect(output).not.toContain('__')
        expect(output).not.toContain('`')
        expect(output).not.toContain('#')

        // No JSON syntax
        expect(output).not.toContain('{')
        expect(output).not.toContain('}')
        expect(output).not.toContain('[')
        expect(output).not.toContain(']')
      }),
      { numRuns: 100 }
    )
  })

  it('formatGapCardText output contains no HTML, Markdown, or JSON syntax', () => {
    fc.assert(
      fc.property(arbGapCard, (card: GapCard) => {
        const output = formatGapCardText(card)

        // No HTML tags
        expect(output).not.toMatch(/<[^>]+>/)

        // No Markdown formatting characters
        expect(output).not.toContain('**')
        expect(output).not.toContain('__')
        expect(output).not.toContain('`')
        expect(output).not.toContain('#')

        // No JSON syntax
        expect(output).not.toContain('{')
        expect(output).not.toContain('}')
        expect(output).not.toContain('[')
        expect(output).not.toContain(']')
      }),
      { numRuns: 100 }
    )
  })
})
