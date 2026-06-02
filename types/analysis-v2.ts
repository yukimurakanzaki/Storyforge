import type { GapItem } from './index'

// === Component Score ===

export interface ComponentScore {
  /** 0-100 score for this component */
  score: number
  /** One-sentence explanation in Bahasa Indonesia */
  explanation: string
}

// === Score Components ===

export interface ScoreComponents {
  /** Kelengkapan Alur (Journey Completeness) — 30% weight */
  kelengkapanAlur: ComponentScore
  /** Kesiapan untuk Sprint (Sprint Readiness) — 25% weight */
  kesiapanSprint: ComponentScore
  /** Kejelasan Requirement (Requirement Clarity) — 25% weight */
  kejelasanRequirement: ComponentScore
  /** Konteks Bisnis (Business Context) — 20% weight */
  konteksBisnis: ComponentScore
  /** Top 3 improvement actions (present when score < 80) */
  topActions: string[]
}

// === Summary Types ===

export interface SummaryItem {
  text: string
  severity: 'high' | 'medium' | 'low'
  /** "Sudah tertulis di BRD" (brd) or "Belum tertulis di BRD" (storyforge) */
  source: 'brd' | 'storyforge'
}

export interface RingkasanTemuan {
  /** Up to 5 — labeled "Risiko utama" in UI */
  criticalGaps: SummaryItem[]
  /** Up to 5 — questions to ask engineering/stakeholder */
  questionsToAsk: SummaryItem[]
  /** Up to 5 — requirements to add to BRD */
  requirementsToAdd: SummaryItem[]
  /** Count of ALL gapCards where source === 'storyforge' */
  totalNewFindings: number
}

// === Gap Card ===

export interface GapCard {
  /** Stable ID for React keys */
  id: string
  /** What is missing or unclear (1-2 sentences, plain language) */
  yangBelumJelas: string
  /** Why it matters (business impact) */
  kenapaPenting: string
  /** Ready-to-send question (copy-paste to Slack) */
  pertanyaanUntukTim: string
  /** Suggested requirement sentence */
  usulanRequirement: string
  /** Gap category (never contains technical jargon) */
  category: string
  severity: 'high' | 'medium' | 'low'
  /** "Sudah tertulis di BRD" (brd) or "Belum tertulis di BRD" (storyforge) */
  source: 'brd' | 'storyforge'
  /** Quoted text from BRD if applicable */
  brdReference: string | null
}

// === Journey Map ===

export interface JourneyNode {
  id: string
  /** Step description in Bahasa Indonesia */
  label: string
  /** explicit = "Ada di BRD", inferred = "Disimpulkan AI", missing = "Belum ada" */
  status: 'explicit' | 'inferred' | 'missing'
}

export interface JourneyEdge {
  /** Source node ID */
  from: string
  /** Target node ID */
  to: string
  pathType: 'happy' | 'error' | 'missing'
  /** Optional edge label */
  label?: string
}

export interface JourneyMap {
  /** Flow name */
  title: string
  nodes: JourneyNode[]
  edges: JourneyEdge[]
  /** "Kami mendeteksi N alur..." or null */
  multiFlowNote: string | null
}

// === Enhanced Analysis Result ===

export interface EnhancedAnalysisResult {
  // === Backward-compatible fields (legacy) ===
  /** Preserved for migration — legacy gap list */
  gapList: GapItem[]
  /** Preserved for migration — legacy clarification questions */
  clarificationQuestions: string[]
  /** 0-100 readiness score */
  readinessScore: number
  /** "Siap" | "Perlu Klarifikasi" | "Tidak Siap" */
  readinessLabel: string

  // === New fields (v2) ===
  scoreComponents: ScoreComponents
  ringkasanTemuan: RingkasanTemuan
  gapCards: GapCard[]
  /** null = AI couldn't produce a journey map */
  journeyMap: JourneyMap | null
  /** Schema version marker */
  version: 2
}

// === Type Guard ===

/**
 * Type guard to check if a value is an EnhancedAnalysisResult (v2).
 * Validates the presence and types of all required fields.
 */
export function isEnhancedResult(result: unknown): result is EnhancedAnalysisResult {
  if (result === null || result === undefined || typeof result !== 'object') {
    return false
  }

  const obj = result as Record<string, unknown>

  // Check version marker
  if (obj.version !== 2) {
    return false
  }

  // Check legacy fields
  if (!Array.isArray(obj.gapList)) return false
  if (!Array.isArray(obj.clarificationQuestions)) return false
  if (typeof obj.readinessScore !== 'number') return false
  if (typeof obj.readinessLabel !== 'string') return false

  // Check v2 fields
  if (typeof obj.scoreComponents !== 'object' || obj.scoreComponents === null) return false
  if (typeof obj.ringkasanTemuan !== 'object' || obj.ringkasanTemuan === null) return false
  if (!Array.isArray(obj.gapCards)) return false

  // journeyMap can be null or an object
  if (obj.journeyMap !== null && (typeof obj.journeyMap !== 'object')) return false

  // Validate scoreComponents structure
  const sc = obj.scoreComponents as Record<string, unknown>
  if (!isComponentScore(sc.kelengkapanAlur)) return false
  if (!isComponentScore(sc.kesiapanSprint)) return false
  if (!isComponentScore(sc.kejelasanRequirement)) return false
  if (!isComponentScore(sc.konteksBisnis)) return false
  if (!Array.isArray(sc.topActions)) return false

  // Validate ringkasanTemuan structure
  const rt = obj.ringkasanTemuan as Record<string, unknown>
  if (!Array.isArray(rt.criticalGaps)) return false
  if (!Array.isArray(rt.questionsToAsk)) return false
  if (!Array.isArray(rt.requirementsToAdd)) return false
  if (typeof rt.totalNewFindings !== 'number') return false

  return true
}

/** Helper to validate ComponentScore shape */
function isComponentScore(value: unknown): value is ComponentScore {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return typeof obj.score === 'number' && typeof obj.explanation === 'string'
}
