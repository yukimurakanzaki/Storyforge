import type { ScoreComponents } from '@/types/analysis-v2'
import { SCORE_WEIGHTS, SCORE_THRESHOLDS, SCORE_LABELS } from './constants'

/**
 * Compute the overall readiness score from individual component scores.
 * Uses weights: kelengkapanAlur 30%, kesiapanSprint 25%, kejelasanRequirement 25%, konteksBisnis 20%.
 *
 * @returns A rounded integer 0-100
 */
export function computeReadinessScore(components: ScoreComponents): number {
  const weighted =
    SCORE_WEIGHTS.kelengkapanAlur * components.kelengkapanAlur.score +
    SCORE_WEIGHTS.kesiapanSprint * components.kesiapanSprint.score +
    SCORE_WEIGHTS.kejelasanRequirement * components.kejelasanRequirement.score +
    SCORE_WEIGHTS.konteksBisnis * components.konteksBisnis.score

  return Math.round(weighted)
}

/**
 * Get the human-readable label for a readiness score.
 *
 * - 80-100: "Siap"
 * - 50-79: "Perlu Klarifikasi"
 * - 0-49: "Tidak Siap"
 */
export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.siap) {
    return SCORE_LABELS.siap
  }
  if (score >= SCORE_THRESHOLDS.perluKlarifikasi) {
    return SCORE_LABELS.perluKlarifikasi
  }
  return SCORE_LABELS.tidakSiap
}

/**
 * Compute up to 3 concrete improvement actions based on which components scored lowest.
 * Only returns actions when score < 80 (i.e., not "Siap").
 * Actions are in Bahasa Indonesia, phrased as concrete tasks.
 *
 * @returns Array of 1-3 action strings when score < 80, empty array when score >= 80
 */
export function computeTopActions(components: ScoreComponents, score: number): string[] {
  if (score >= SCORE_THRESHOLDS.siap) {
    return []
  }

  // Rank components by score (ascending — lowest first)
  const ranked: { key: string; score: number; action: string }[] = [
    {
      key: 'kelengkapanAlur',
      score: components.kelengkapanAlur.score,
      action: 'Lengkapi alur user — tambahkan langkah error handling dan skenario gagal di setiap tahap.',
    },
    {
      key: 'kesiapanSprint',
      score: components.kesiapanSprint.score,
      action: 'Tambahkan detail yang dibutuhkan engineering: status menunggu, batas waktu proses, dan aturan coba lagi.',
    },
    {
      key: 'kejelasanRequirement',
      score: components.kejelasanRequirement.score,
      action: 'Perjelas requirement yang ambigu — pastikan setiap requirement bisa diuji dan punya kriteria sukses.',
    },
    {
      key: 'konteksBisnis',
      score: components.konteksBisnis.score,
      action: 'Tambahkan konteks bisnis — jelaskan tujuan, metrik keberhasilan, dan batasan yang berlaku.',
    },
  ]

  // Sort ascending by score (worst components first)
  ranked.sort((a, b) => a.score - b.score)

  // Return up to 3 actions for the lowest-scoring components
  // Only include components that actually have room for improvement (score < 100)
  const actions = ranked
    .filter((item) => item.score < 100)
    .slice(0, 3)
    .map((item) => item.action)

  // Ensure at least 1 action when score < 80
  if (actions.length === 0) {
    actions.push('Tinjau ulang BRD secara keseluruhan untuk memastikan semua aspek sudah tercakup.')
  }

  return actions
}
