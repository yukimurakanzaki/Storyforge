export type GapSeverity = 'high' | 'medium' | 'low'
export type GapConfidence = 'high' | 'medium' | 'low'

export interface GapItem {
  category: string
  description: string
  severity: GapSeverity
  confidence?: GapConfidence
  reference?: string | null
}

export interface AnalysisResult {
  id?: string
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

export interface QAAnswer {
  answer: string
  isOutOfScope: boolean
}

export interface InvestCriteria {
  independent: string
  negotiable: string
  valuable: string
  estimable: string
  small: string
  testable: string
}

export interface GherkinScenario {
  title: string
  given: string[]
  when: string[]
  then: string[]
}

export interface FieldRow {
  fieldName: string
  description: string
  dataType: string
  example: string
}

export interface UserStory {
  title: string
  asA: string
  iWant: string
  soThat: string
  investNotes: InvestCriteria
  acceptanceCriteria: GherkinScenario[]
  fieldContextTable?: FieldRow[]
}

export interface RequirementsResult {
  userStories: UserStory[]
  generatedAt: string
}

export interface TempSession {
  id: string
  createdAt: string
  brdText: string
  messages: ChatMessage[]
  result: AnalysisResult | null
  requirements: RequirementsResult | null
  refinementRounds: number
  hasGenerated: boolean
  qaAnswers: QAAnswer[]
}

export type ProjectContext = {
  business: {
    description: string
    target_users: string[]
    domain: string
    compliance: string[]
    naming_conventions: Record<string, string>
    past_decisions: string[]
  }
  technical: {
    frontend: string
    backend: string
    existing_systems: string[]
    integrations: string[]
    constraints: string[]
    tech_debt: string[]
  }
}

export type Project = {
  id: string
  user_id: string
  name: string
  context: ProjectContext
  design_md: string | null
  design_md_source: 'uploaded' | 'generated' | null
  created_at: string
}

export type SectionStatus = 'empty' | 'generating' | 'done' | 'stale'

export type SectionName =
  | 'foundation'
  | 'roles'
  | 'flow'
  | 'engineer'
  | 'designer'
  | 'qa'
  | 'templates'
  | 'stakeholder'

export type SectionStates = Record<SectionName, SectionStatus>

export type SectionBlobs = Partial<Record<SectionName, unknown>>

export type SessionState = 'refining' | 'ready' | 'done'
