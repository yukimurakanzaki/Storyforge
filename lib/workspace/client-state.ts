// lib/workspace/client-state.ts
import type { WorkspaceState, WorkspaceGap } from '@/types/workspace'

export function emptyClientState(sessionId: string): WorkspaceState {
  return {
    sessionId, title: '', brdText: '', gaps: [], readinessScore: 100, readinessLabel: 'Siap',
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: '',
  }
}

export function withOptimisticUserMessage(state: WorkspaceState | null, sessionId: string, text: string): WorkspaceState {
  const base = state ?? emptyClientState(sessionId)
  return { ...base, messages: [...base.messages, { role: 'user', content: text }] }
}

export function partitionGaps(gaps: WorkspaceGap[]): { open: WorkspaceGap[]; resolved: WorkspaceGap[] } {
  return { open: gaps.filter((g) => g.status === 'open'), resolved: gaps.filter((g) => g.status !== 'open') }
}

/** Visible text color per readiness band (never a background token). */
export function scoreColor(score: number): string {
  if (score >= 80) return 'text-teal-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

/** Map resolved gap ids → their question text, using the gaps BEFORE the update was applied. */
export function resolvedQuestions(gapsBefore: WorkspaceGap[], resolvedGapIds: string[]): string[] {
  const byId = new Map(gapsBefore.map((g) => [g.id, g.question]))
  return resolvedGapIds.map((id) => byId.get(id)).filter((q): q is string => !!q)
}
