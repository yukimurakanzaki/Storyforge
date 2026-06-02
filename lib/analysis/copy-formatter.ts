/**
 * Copy Formatter Utilities — Plain Text Output for PM Workflows
 *
 * Produces plain text output suitable for pasting into Slack, WhatsApp,
 * grooming documents, or PRDs. No HTML, no Markdown, no JSON syntax.
 *
 * Referenced by: Requirements 9.1, 9.2, 9.3, 9.4
 */

import type { GapCard } from '@/types/analysis-v2'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'
import { GAP_CARD_LABELS, SECTION_LABELS, SUMMARY_LABELS } from '@/lib/analysis/constants'

/**
 * Formats all questions from gap cards as a numbered list.
 * Each line contains one card's `pertanyaanUntukTim` field.
 *
 * Output example:
 *   1. Apa yang terjadi kalau user klik tombol dua kali?
 *   2. Bagaimana kalau koneksi terputus saat proses pembayaran?
 *
 * @param gapCards - Array of GapCard objects
 * @returns Plain text numbered list, one question per line
 */
export function formatAllQuestions(gapCards: GapCard[]): string {
  if (gapCards.length === 0) return ''

  return gapCards
    .map((card, index) => `${index + 1}. ${card.pertanyaanUntukTim}`)
    .join('\n')
}

/**
 * Formats all suggested requirements from gap cards as a bullet list.
 * Each line contains one card's `usulanRequirement` field.
 *
 * Output example:
 *   • Sistem harus menampilkan pesan error jika koneksi terputus.
 *   • Tombol submit harus di-disable setelah klik pertama.
 *
 * @param gapCards - Array of GapCard objects
 * @returns Plain text bullet list, one requirement per line
 */
export function formatAllRequirements(gapCards: GapCard[]): string {
  if (gapCards.length === 0) return ''

  return gapCards
    .map((card) => `\u2022 ${card.usulanRequirement}`)
    .join('\n')
}

/**
 * Formats a single GapCard as plain text with labeled fields.
 * Suitable for pasting into a document or chat message.
 *
 * Output example:
 *   Yang belum jelas: User bisa klik tombol berkali-kali tanpa batasan.
 *   Kenapa penting: Bisa menyebabkan duplikasi transaksi dan kerugian finansial.
 *   Pertanyaan untuk tim: Apa yang terjadi kalau user klik tombol bayar dua kali?
 *   Usulan requirement: Sistem harus men-disable tombol submit setelah klik pertama hingga proses selesai.
 *
 * @param card - A single GapCard object
 * @returns Plain text representation with all 4 labeled fields
 */
export function formatGapCardText(card: GapCard): string {
  return [
    `${GAP_CARD_LABELS.yangBelumJelas}: ${card.yangBelumJelas}`,
    `${GAP_CARD_LABELS.kenapaPenting}: ${card.kenapaPenting}`,
    `${GAP_CARD_LABELS.pertanyaanUntukTim}: ${card.pertanyaanUntukTim}`,
    `${GAP_CARD_LABELS.usulanRequirement}: ${card.usulanRequirement}`,
  ].join('\n')
}

export function formatAnalysisReviewText(result: EnhancedAnalysisResult): string {
  const lines: string[] = [
    SECTION_LABELS.outputPanel,
    `Readiness Score: ${result.readinessScore}/100 (${result.readinessLabel})`,
    SECTION_LABELS.newFindingsHeader(result.ringkasanTemuan.totalNewFindings),
  ]

  if (result.ringkasanTemuan.criticalGaps.length > 0) {
    lines.push('', SUMMARY_LABELS.criticalGaps)
    result.ringkasanTemuan.criticalGaps.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.text}`)
    })
  }

  const questions = formatAllQuestions(result.gapCards)
  if (questions) {
    lines.push('', SUMMARY_LABELS.questionsToAsk, questions)
  }

  const requirements = formatAllRequirements(result.gapCards)
  if (requirements) {
    lines.push('', SUMMARY_LABELS.requirementsToAdd, requirements)
  }

  const firstAction = result.scoreComponents.topActions[0]
  if (firstAction) {
    lines.push('', 'Langkah berikutnya', firstAction)
  }

  return lines.join('\n')
}
