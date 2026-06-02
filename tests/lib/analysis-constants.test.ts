import { describe, it, expect } from 'vitest'
import {
  GAP_CARD_FIELDS,
  GAP_CARD_LABELS,
  SUMMARY_LABELS,
  SUMMARY_MAX_ITEMS_PER_CATEGORY,
  TOTAL_NEW_FINDINGS_SOURCE,
  SOURCE_LABELS,
  SEVERITY_ORDER,
  SEVERITY_LABELS,
  SCORE_LABELS,
  SCORE_THRESHOLDS,
  SCORE_WEIGHTS,
  SSE_STATUS_MESSAGES,
  AI_TIMEOUT_MS,
  TIMEOUT_ERROR_MESSAGE,
  COPY_LABELS,
  MAX_GAP_CARDS,
  FORBIDDEN_CATEGORY_TERMS,
  TOKEN_BUDGET,
  SECTION_LABELS,
} from '@/lib/analysis/constants'

describe('V2 Analysis Constants — Naming Audit', () => {
  it('GapCard fields use canonical Bahasa Indonesia camelCase names', () => {
    expect(GAP_CARD_FIELDS.pertanyaanUntukTim).toBe('pertanyaanUntukTim')
    expect(GAP_CARD_FIELDS.usulanRequirement).toBe('usulanRequirement')
    expect(GAP_CARD_FIELDS.yangBelumJelas).toBe('yangBelumJelas')
    expect(GAP_CARD_FIELDS.kenapaPenting).toBe('kenapaPenting')
  })

  it('GapCard UI labels are in Bahasa Indonesia', () => {
    expect(GAP_CARD_LABELS.pertanyaanUntukTim).toBe('Pertanyaan untuk tim')
    expect(GAP_CARD_LABELS.usulanRequirement).toBe('Usulan requirement')
    expect(GAP_CARD_LABELS.yangBelumJelas).toBe('Yang belum jelas')
    expect(GAP_CARD_LABELS.kenapaPenting).toBe('Kenapa penting')
  })

  it('Summary category "criticalGaps" maps to "Risiko utama" (never "Critical gaps")', () => {
    expect(SUMMARY_LABELS.criticalGaps).toBe('Risiko utama')
    expect(SUMMARY_LABELS.criticalGaps).not.toContain('Critical')
    expect(SUMMARY_LABELS.criticalGaps).not.toContain('critical')
  })

  it('totalNewFindings counts from source "storyforge" (all gapCards, not just summary)', () => {
    expect(TOTAL_NEW_FINDINGS_SOURCE).toBe('storyforge')
  })

  it('source labels use Bahasa Indonesia', () => {
    expect(SOURCE_LABELS.brd).toBe('Sudah tertulis di BRD')
    expect(SOURCE_LABELS.storyforge).toBe('Belum tertulis di BRD')
  })

  it('timeout behavior is simplified: error message only, no partial parsing', () => {
    expect(AI_TIMEOUT_MS).toBe(45_000)
    expect(TIMEOUT_ERROR_MESSAGE).toBe(
      'Analisis membutuhkan waktu terlalu lama. Coba lagi.'
    )
  })

  it('score weights sum to 1.0', () => {
    const total =
      SCORE_WEIGHTS.kelengkapanAlur +
      SCORE_WEIGHTS.kesiapanSprint +
      SCORE_WEIGHTS.kejelasanRequirement +
      SCORE_WEIGHTS.konteksBisnis
    expect(total).toBeCloseTo(1.0)
  })

  it('score thresholds are consistent with labels', () => {
    expect(SCORE_THRESHOLDS.siap).toBe(80)
    expect(SCORE_THRESHOLDS.perluKlarifikasi).toBe(50)
    expect(SCORE_LABELS.siap).toBe('Siap')
    expect(SCORE_LABELS.perluKlarifikasi).toBe('Perlu Klarifikasi')
    expect(SCORE_LABELS.tidakSiap).toBe('Tidak Siap')
  })

  it('SSE status messages are in Bahasa Indonesia and ordered by delay', () => {
    expect(SSE_STATUS_MESSAGES.length).toBe(5)
    for (let i = 1; i < SSE_STATUS_MESSAGES.length; i++) {
      expect(SSE_STATUS_MESSAGES[i].delay).toBeGreaterThan(
        SSE_STATUS_MESSAGES[i - 1].delay
      )
    }
    expect(SSE_STATUS_MESSAGES[0].message).toBe('Sedang membaca BRD...')
  })

  it('forbidden terms include all banned user-facing labels', () => {
    expect(FORBIDDEN_CATEGORY_TERMS).toContain('blindspot')
    expect(FORBIDDEN_CATEGORY_TERMS).toContain('technical')
    expect(FORBIDDEN_CATEGORY_TERMS).toContain('edge case')
    expect(FORBIDDEN_CATEGORY_TERMS).toContain('critical gaps')
    expect(FORBIDDEN_CATEGORY_TERMS).toContain('foundation')
  })

  it('section label never uses "Foundation"', () => {
    expect(SECTION_LABELS.outputPanel).toBe('Hasil Review BRD')
    expect(SECTION_LABELS.outputPanel).not.toContain('Foundation')
  })

  it('MVP constraints are defined', () => {
    expect(MAX_GAP_CARDS).toBe(10)
    expect(SUMMARY_MAX_ITEMS_PER_CATEGORY).toBe(5)
  })

  it('token budgets differ by tier', () => {
    expect(TOKEN_BUDGET.free).toBe(6144)
    expect(TOKEN_BUDGET.pro).toBe(8192)
    expect(TOKEN_BUDGET.pro).toBeGreaterThan(TOKEN_BUDGET.free)
  })

  it('copy labels are in Bahasa Indonesia with contextual toast messages', () => {
    expect(COPY_LABELS.copyAllQuestions).toBe('Salin Semua Pertanyaan')
    expect(COPY_LABELS.copyAllRequirements).toBe('Salin Semua Usulan')
    expect(COPY_LABELS.toastQuestionsCopied).toContain('Slack')
    expect(COPY_LABELS.toastRequirementsCopied).toContain('PRD')
  })

  it('severity order is high > medium > low', () => {
    expect(SEVERITY_ORDER.high).toBeGreaterThan(SEVERITY_ORDER.medium)
    expect(SEVERITY_ORDER.medium).toBeGreaterThan(SEVERITY_ORDER.low)
  })

  it('severity labels are Bahasa Indonesia, not raw English enums', () => {
    expect(SEVERITY_LABELS.high).toBe('Tinggi')
    expect(SEVERITY_LABELS.medium).toBe('Sedang')
    expect(SEVERITY_LABELS.low).toBe('Rendah')
  })
})
