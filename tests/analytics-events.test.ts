import { describe, it, expect } from 'vitest'
import { ANALYSIS_EVENTS, isAnalysisEvent } from '@/lib/analytics/events'

describe('ANALYSIS_EVENTS allow-list (P0-02)', () => {
  it('contains the 12 canonical event types', () => {
    const expected = [
      'signup_completed', 'session_started', 'analysis_started', 'analysis_completed',
      'gaps_viewed', 'gap_resolved', 'prd_generated', 'prd_exported',
      'paywall_viewed', 'subscription_started', 'user_returned', 'prd_rated',
    ]
    expect([...ANALYSIS_EVENTS]).toEqual(expected)
  })

  it('the two events emitted today are in the allow-list', () => {
    expect(isAnalysisEvent('analysis_started')).toBe(true)
    expect(isAnalysisEvent('analysis_completed')).toBe(true)
  })

  it('rejects unknown event types', () => {
    expect(isAnalysisEvent('totally_made_up')).toBe(false)
    expect(isAnalysisEvent('')).toBe(false)
  })
})
