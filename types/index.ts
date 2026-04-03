export type GapSeverity = 'high' | 'medium' | 'low'

export interface GapItem {
  category: string
  description: string
  severity: GapSeverity
}

export interface AnalysisResult {
  gapList: GapItem[]
  clarificationQuestions: string[]
  readinessScore: number
  readinessLabel: string
  sessionId: string
  createdAt: string
}

export interface UsageCounter {
  count: number
  resetAt: string | null
  firstAnalysisAt: string | null
}

export interface UserSubscription {
  plan: 'free' | 'pro'
  status: 'active' | 'cancelled' | 'grace_period' | 'frozen'
  currentPeriodEnd: string | null
}
