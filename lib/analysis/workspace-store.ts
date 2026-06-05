// lib/analysis/workspace-store.ts
import { randomUUID } from 'crypto'
import { getScoreLabel } from './score-utils'
import { computeWorkspaceScore } from './workspace-score'
import type { WorkspaceState, WorkspaceGap, PrdDraft } from '@/types/workspace'
import type { ChatMessage } from '@/types'

type Row = Record<string, unknown>

function deriveTitle(row: Row): string {
  if (typeof row.title === 'string' && row.title.trim()) return row.title.trim()
  const brd = typeof row.brd_text === 'string' ? row.brd_text : ''
  const first = brd.split('\n')[0].replace(/^#+\s*/, '').trim()
  return first.slice(0, 60) || 'Sesi tanpa judul'
}

/** Build WorkspaceGap[] from legacy gap_list + clarification_questions. */
export function legacyGaps(row: Row): WorkspaceGap[] {
  const out: WorkspaceGap[] = []
  const now = new Date().toISOString()
  const questions = Array.isArray(row.clarification_questions) ? row.clarification_questions as string[] : []
  for (const q of questions) {
    out.push({ id: randomUUID(), category: 'functional', description: q, severity: 'medium',
      question: q, status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: now, resolvedAt: null })
  }
  const list = Array.isArray(row.gap_list) ? row.gap_list as { category: string; description: string; severity: WorkspaceGap['severity'] }[] : []
  const seen = new Set(out.map((g) => g.question.trim().toLowerCase()))
  for (const g of list) {
    const question = g.description
    if (seen.has(question.trim().toLowerCase())) continue
    out.push({ id: randomUUID(), category: 'functional', description: g.description, severity: g.severity ?? 'medium',
      question, status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: now, resolvedAt: null })
  }
  return out
}

export function rowToState(row: Row): WorkspaceState {
  const gaps = Array.isArray(row.gaps) && (row.gaps as unknown[]).length > 0
    ? (row.gaps as WorkspaceGap[])
    : legacyGaps(row)

  const prd = (row.prd ?? null) as PrdDraft | null
  const score = typeof row.readiness_score === 'number' ? row.readiness_score : computeWorkspaceScore(gaps)

  return {
    sessionId: String(row.session_id),
    title: deriveTitle(row),
    brdText: (row.brd_text as string) ?? '',
    gaps,
    readinessScore: score,
    readinessLabel: (row.readiness_label as string) ?? getScoreLabel(score),
    prd,
    messages: (Array.isArray(row.messages) ? row.messages : []) as ChatMessage[],
    contextSummary: (row.context_summary as string) ?? '',
    summarizedUpTo: (row.summarized_up_to as number) ?? 0,
    lastActiveAt: (row.last_active_at as string) ?? new Date().toISOString(),
  }
}

/** Map state → analysis_results columns for upsert (onConflict: session_id). */
export function stateToRow(state: WorkspaceState, userId: string, projectId: string | null): Row {
  return {
    user_id: userId,
    session_id: state.sessionId,
    project_id: projectId,
    title: state.title,
    brd_text: state.brdText || state.title || 'Requirement',  // brd_text is NOT NULL
    gaps: state.gaps,
    prd: state.prd,
    messages: state.messages,
    readiness_score: state.readinessScore,
    readiness_label: state.readinessLabel,
    context_summary: state.contextSummary,
    summarized_up_to: state.summarizedUpTo,
    last_active_at: state.lastActiveAt,
    status: 'active',
  }
}
