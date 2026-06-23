// Canonical analytics event taxonomy (P0-02).
//
// event_type is stored as TEXT in `analysis_events` (NOT a Postgres ENUM), so
// new event types never require a migration. This `as const` allow-list is the
// single source of truth on the application side — extend it here and the type
// system picks up the new value everywhere `AnalysisEventType` is used.
export const ANALYSIS_EVENTS = [
  'signup_completed',
  'session_started',
  'analysis_started',
  'analysis_completed',
  'gaps_viewed',
  'gap_resolved',
  'prd_generated',
  'prd_exported',
  'paywall_viewed',
  'subscription_started',
  'user_returned',
  'prd_rated',
] as const

export type AnalysisEventType = (typeof ANALYSIS_EVENTS)[number]

export function isAnalysisEvent(value: string): value is AnalysisEventType {
  return (ANALYSIS_EVENTS as readonly string[]).includes(value)
}
