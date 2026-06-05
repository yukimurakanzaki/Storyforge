// types/workspace.ts
import type { ChatMessage } from './index'

export type GapStatus = 'open' | 'answered' | 'out_of_scope'
export type GapCategory =
  | 'business' | 'functional' | 'non_functional'
  | 'role' | 'edge_case' | 'constraint_conflict'

export interface WorkspaceGap {
  id: string
  category: GapCategory
  description: string
  severity: 'high' | 'medium' | 'low'
  question: string
  status: GapStatus
  answer: string | null
  source: 'brd' | 'chat'
  conflictsWith: string | null   // set when category === 'constraint_conflict'
  createdAt: string
  resolvedAt: string | null
}

export interface PrdDraft {
  markdown: string
  openQuestions: string[]
  assumptions: string[]
  version: number
  generatedAt: string
}

export type WorkspaceIntent =
  | 'new_or_expanded_requirement'
  | 'answer_pending_question'
  | 'command'
  | 'general_chat'

export interface WorkspaceState {
  sessionId: string
  title: string
  brdText: string                // canonical original requirement (satisfies brd_text NOT NULL; never overwritten on resume)
  gaps: WorkspaceGap[]
  readinessScore: number
  readinessLabel: string
  prd: PrdDraft | null
  messages: ChatMessage[]
  contextSummary: string
  summarizedUpTo: number
  lastActiveAt: string
}

export interface ModelTurnResponse {
  intent: WorkspaceIntent
  assistantMessage: string
  newGaps: Array<{
    category: GapCategory
    description: string
    severity: 'high' | 'medium' | 'low'
    question: string
    source: 'brd' | 'chat'
    conflictsWith?: string | null
  }>
  resolvedGapIds: string[]
  gapAnswers: Record<string, string>
  outOfScopeGapIds: string[]
  prd: { markdown: string; openQuestions: string[]; assumptions: string[] } | null
}

export interface UserContext {
  industry: string
  role: string
  compliance: string[]
  techDefaults: Record<string, string>   // e.g. { storage: 'S3', backend: 'Supabase' }
  standingInstructions: string
  prdTemplate: string
}
