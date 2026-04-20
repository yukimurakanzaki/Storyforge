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

export type Phase = 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Story {
  title: string
  description: string
  acceptanceCriteria: string[]
}

export interface Epic {
  title: string
  description: string
  stories: Story[]
}

export interface RequirementsResult {
  epics: Epic[]
  generatedAt: string
}
