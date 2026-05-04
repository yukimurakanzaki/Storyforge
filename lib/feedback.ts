export type FeedbackType = 'inaccurate' | 'duplicate' | 'irrelevant'
export type FeedbackConfidence = 'high' | 'medium' | 'low'

export interface ValidatedFeedback {
  analysis_id: string
  gap_index: number
  gap_text: string
  category: string | null
  confidence: FeedbackConfidence | null
  feedback_type: FeedbackType
  note: string | null
}

type FeedbackValidationResult =
  | { valid: true; feedback: ValidatedFeedback }
  | { valid: false; error: string; status: number }

const FEEDBACK_TYPES = new Set<FeedbackType>([
  'inaccurate',
  'duplicate',
  'irrelevant',
])

const CONFIDENCE_LEVELS = new Set<FeedbackConfidence>(['high', 'medium', 'low'])

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export function validateFeedbackPayload(body: unknown): FeedbackValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Missing request body', status: 400 }
  }

  const payload = body as Record<string, unknown>
  const analysisId = payload.analysis_id
  if (typeof analysisId !== 'string' || !isUuid(analysisId)) {
    return { valid: false, error: 'Invalid analysis id', status: 400 }
  }

  const gapIndex = payload.gap_index
  if (!Number.isInteger(gapIndex) || (gapIndex as number) < 0) {
    return { valid: false, error: 'Invalid gap index', status: 400 }
  }

  const gapText = payload.gap_text
  if (typeof gapText !== 'string' || gapText.trim().length === 0) {
    return { valid: false, error: 'Missing gap text', status: 400 }
  }

  const feedbackType = payload.feedback_type
  if (
    typeof feedbackType !== 'string' ||
    !FEEDBACK_TYPES.has(feedbackType as FeedbackType)
  ) {
    return { valid: false, error: 'Invalid feedback type', status: 400 }
  }

  const confidence = payload.confidence
  if (
    confidence !== undefined &&
    confidence !== null &&
    (typeof confidence !== 'string' ||
      !CONFIDENCE_LEVELS.has(confidence as FeedbackConfidence))
  ) {
    return { valid: false, error: 'Invalid confidence', status: 400 }
  }

  const category = payload.category
  if (category !== undefined && category !== null && typeof category !== 'string') {
    return { valid: false, error: 'Invalid category', status: 400 }
  }

  const note = payload.note
  if (note !== undefined && note !== null && typeof note !== 'string') {
    return { valid: false, error: 'Invalid note', status: 400 }
  }

  return {
    valid: true,
    feedback: {
      analysis_id: analysisId,
      gap_index: gapIndex as number,
      gap_text: gapText.trim(),
      category: typeof category === 'string' && category.trim() ? category.trim() : null,
      confidence:
        typeof confidence === 'string' && CONFIDENCE_LEVELS.has(confidence as FeedbackConfidence)
          ? (confidence as FeedbackConfidence)
          : null,
      feedback_type: feedbackType as FeedbackType,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
    },
  }
}
