import { describe, expect, it } from 'vitest'
import { validateFeedbackPayload } from '@/lib/feedback'

describe('validateFeedbackPayload', () => {
  it('accepts valid gap feedback and trims optional note', () => {
    expect(
      validateFeedbackPayload({
        analysis_id: '3e5b4cd8-8d5f-4661-82c2-a39f3ac37e59',
        gap_index: 1,
        gap_text: 'Payment timeout belum dijelaskan.',
        category: 'Functional Requirements',
        confidence: 'high',
        feedback_type: 'inaccurate',
        note: '  Sudah ada di appendix.  ',
      })
    ).toEqual({
      valid: true,
      feedback: {
        analysis_id: '3e5b4cd8-8d5f-4661-82c2-a39f3ac37e59',
        gap_index: 1,
        gap_text: 'Payment timeout belum dijelaskan.',
        category: 'Functional Requirements',
        confidence: 'high',
        feedback_type: 'inaccurate',
        note: 'Sudah ada di appendix.',
      },
    })
  })

  it('rejects invalid feedback type', () => {
    expect(
      validateFeedbackPayload({
        analysis_id: '3e5b4cd8-8d5f-4661-82c2-a39f3ac37e59',
        gap_index: 0,
        gap_text: 'Gap',
        feedback_type: 'wrong',
      })
    ).toEqual({
      valid: false,
      error: 'Invalid feedback type',
      status: 400,
    })
  })

  it('rejects negative gap indexes', () => {
    expect(
      validateFeedbackPayload({
        analysis_id: '3e5b4cd8-8d5f-4661-82c2-a39f3ac37e59',
        gap_index: -1,
        gap_text: 'Gap',
        feedback_type: 'duplicate',
      })
    ).toEqual({
      valid: false,
      error: 'Invalid gap index',
      status: 400,
    })
  })
})
