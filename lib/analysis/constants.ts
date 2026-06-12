/**
 * V2 Analysis Engine — Canonical Naming Constants
 *
 * This file establishes the single source of truth for field names, UI labels,
 * category names, and copy strings used across the v2 analysis engine.
 *
 * RULES:
 * - All user-facing text is in Bahasa Indonesia
 * - JSON field names are in English (camelCase)
 * - GapCard content fields use Bahasa Indonesia camelCase: pertanyaanUntukTim, usulanRequirement
 * - Never use "critical gaps", "technical blindspot", or "edge case" in user-facing output
 * - The word "Foundation" is never shown to users — use "Hasil Review BRD" or "Analisis BRD"
 *
 * Referenced by: Requirements 3.1, 8.3, 8.4, 10.3
 */

// ─── GapCard Field Names (canonical, matching PM-facing UI labels) ───────────

export const GAP_CARD_FIELDS = {
  /** What is missing or unclear (1-2 sentences, plain language) */
  yangBelumJelas: 'yangBelumJelas',
  /** Why this matters (business impact, not technical explanation) */
  kenapaPenting: 'kenapaPenting',
  /** Ready-to-send question for engineering/stakeholder (copy-paste to Slack) */
  pertanyaanUntukTim: 'pertanyaanUntukTim',
  /** Suggested requirement sentence (directly insertable into PRD) */
  usulanRequirement: 'usulanRequirement',
} as const

// ─── UI Labels for GapCard Fields ────────────────────────────────────────────

export const GAP_CARD_LABELS = {
  yangBelumJelas: 'Yang belum jelas',
  kenapaPenting: 'Kenapa penting',
  pertanyaanUntukTim: 'Pertanyaan untuk tim',
  usulanRequirement: 'Usulan requirement',
} as const

// ─── Summary Section (RingkasanTemuan) ───────────────────────────────────────

/**
 * The RingkasanTemuan interface uses these field names internally:
 * - criticalGaps → UI label: "Risiko utama" (NEVER "Critical gaps")
 * - questionsToAsk → UI label: "Pertanyaan untuk tim"
 * - requirementsToAdd → UI label: "Usulan requirement baru"
 */
export const SUMMARY_LABELS = {
  /** Internal field: criticalGaps — User-facing: "Risiko utama" */
  criticalGaps: 'Risiko utama',
  /** Internal field: questionsToAsk — User-facing: "Pertanyaan untuk tim" */
  questionsToAsk: 'Pertanyaan untuk tim',
  /** Internal field: requirementsToAdd — User-facing: "Usulan requirement baru" */
  requirementsToAdd: 'Usulan requirement baru',
} as const

export const SUMMARY_MAX_ITEMS_PER_CATEGORY = 5

// ─── totalNewFindings Computation Rule ───────────────────────────────────────

/**
 * totalNewFindings = count of ALL gapCards where source === 'storyforge'
 *
 * IMPORTANT: This counts from the FULL gapCards array (up to 10 items),
 * NOT only items selected into the summary (ringkasanTemuan).
 * This gives PMs an honest metric of how many new insights StoryForge added.
 */
export const TOTAL_NEW_FINDINGS_SOURCE = 'storyforge' as const

// ─── Source Tags ─────────────────────────────────────────────────────────────

export const SOURCE_LABELS = {
  brd: 'Sudah tertulis di BRD',
  storyforge: 'Belum tertulis di BRD',
} as const

export type GapSource = keyof typeof SOURCE_LABELS

// ─── Severity ────────────────────────────────────────────────────────────────

export const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 } as const
export type GapSeverity = 'high' | 'medium' | 'low'

export const SEVERITY_LABELS: Record<GapSeverity, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
} as const

// ─── Score Labels ────────────────────────────────────────────────────────────

export const SCORE_LABELS = {
  siap: 'Siap',
  perluKlarifikasi: 'Perlu Klarifikasi',
  tidakSiap: 'Tidak Siap',
} as const

export const SCORE_THRESHOLDS = {
  siap: 80,
  perluKlarifikasi: 50,
} as const

// ─── Score Component Weights ─────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  kelengkapanAlur: 0.30,
  kesiapanSprint: 0.25,
  kejelasanRequirement: 0.25,
  konteksBisnis: 0.20,
} as const

// ─── Section Labels (user-facing) ───────────────────────────────────────────

export const SECTION_LABELS = {
  /** Main output section title — NEVER use "Foundation" */
  outputPanel: 'Hasil Review BRD',
  /** Alternative label */
  outputPanelAlt: 'Analisis BRD',
  /** Summary header metric */
  newFindingsHeader: (count: number) => `${count} temuan baru yang belum ada di BRD`,
} as const

// ─── SSE Status Messages (timer-based, Bahasa Indonesia) ─────────────────────

export const SSE_STATUS_MESSAGES = [
  { delay: 0, message: 'Sedang membaca BRD...' },
  { delay: 3000, message: 'Memetakan alur utama user...' },
  { delay: 8000, message: 'Mengecek skenario yang sering terlewat...' },
  { delay: 15000, message: 'Menyusun pertanyaan untuk tim...' },
  { delay: 20000, message: 'Membuat usulan requirement...' },
] as const

// ─── Timeout & Error Messages ────────────────────────────────────────────────

/**
 * MVP timeout behavior (simplified):
 * - On AI timeout (>45s): abort stream, emit error event with TIMEOUT_ERROR_MESSAGE
 * - NO partial JSON parsing for MVP
 * - No recovery attempt from partial data
 */
export const AI_TIMEOUT_MS = 45_000
export const TIMEOUT_ERROR_MESSAGE = 'Analisis membutuhkan waktu terlalu lama. Coba lagi.'
export const GENERIC_ERROR_MESSAGE = 'Terjadi kesalahan saat memproses. Coba lagi.'
export const DISCONNECT_MESSAGE = 'Koneksi terputus. Coba lagi?'

// ─── Copy Action Labels ──────────────────────────────────────────────────────

export const COPY_LABELS = {
  copyAllQuestions: 'Salin Semua Pertanyaan',
  copyAllRequirements: 'Salin Semua Usulan',
  toastQuestionsCopied: 'Pertanyaan disalin. Siap ditempel ke Slack atau dokumen grooming.',
  toastRequirementsCopied: 'Usulan requirement disalin. Siap ditempel ke PRD.',
} as const

// ─── Next Best Action ────────────────────────────────────────────────────────

export const NEXT_ACTION_LABEL = 'Langkah berikutnya'
export const NEXT_ACTION_DEFAULT =
  'Mulai dari 5 pertanyaan ini saat grooming. Setelah terjawab, jalankan analisis ulang untuk melihat apakah skor naik.'

// ─── Chat Relationship Copy ──────────────────────────────────────────────────

export const REFINEMENT_CHAT_INTRO =
  'Mau memperbaiki hasilnya? Jawab pertanyaan klarifikasi di bawah, lalu StoryForge akan memperbarui analisis.'

// ─── No Gaps Found ───────────────────────────────────────────────────────────

export const NO_GAPS_MESSAGE =
  'Belum ada gap besar yang terdeteksi. BRD ini terlihat cukup siap, tapi tetap validasi asumsi utama dengan tim.'

// ─── Journey Map ─────────────────────────────────────────────────────────────

export const JOURNEY_MAP_UNAVAILABLE =
  'BRD belum cukup detail untuk membuat peta perjalanan. Coba tambahkan alur langkah-langkah user.'

export const JOURNEY_NODE_STATUS_LABELS = {
  explicit: 'Ada di BRD',
  inferred: 'Disimpulkan AI',
  missing: 'Belum ada',
} as const

export const JOURNEY_PATH_TYPES = {
  happy: 'happy',
  error: 'error',
  missing: 'missing',
} as const

// ─── MVP Constraints ─────────────────────────────────────────────────────────

export const MAX_GAP_CARDS = 10
export const MAX_JOURNEY_FLOWS = 1

// ─── Forbidden Terms (never use in user-facing category labels) ──────────────

export const FORBIDDEN_CATEGORY_TERMS = [
  'blindspot',
  'teknis',
  'technical',
  'edge case',
  'critical gaps',
  'AI-generated insight',
  'invalid',
  'foundation',
] as const

// ─── Token Budget by Tier ────────────────────────────────────────────────────

export const TOKEN_BUDGET = {
  // V2 output is richer (gap cards + journey map + score breakdown) than the
  // legacy schema, so free tier needs more headroom to avoid truncated JSON
  // on longer BRDs (truncation → parse failure → generic error).
  free: 6144,
  pro: 8192,
} as const
