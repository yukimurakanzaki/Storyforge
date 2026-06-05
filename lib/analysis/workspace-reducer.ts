// lib/analysis/workspace-reducer.ts
import { randomUUID } from 'crypto'
import { computeWorkspaceScore } from './workspace-score'
import { getScoreLabel } from './score-utils'
import type { WorkspaceState, ModelTurnResponse, WorkspaceGap } from '@/types/workspace'

/** Pure reducer: apply one model turn to the workspace state. Never mutates inputs. */
export function applyTurn(state: WorkspaceState, res: ModelTurnResponse, now: string): WorkspaceState {
  let gaps: WorkspaceGap[] = state.gaps.map((g) => {
    if (res.resolvedGapIds.includes(g.id) && g.status === 'open') {
      return { ...g, status: 'answered', answer: res.gapAnswers[g.id] ?? g.answer ?? '', resolvedAt: now }
    }
    if (res.outOfScopeGapIds.includes(g.id) && g.status === 'open') {
      return { ...g, status: 'out_of_scope', resolvedAt: now }
    }
    return g
  })

  const seen = new Set(gaps.map((g) => g.question.trim().toLowerCase()))
  for (const ng of res.newGaps) {
    const key = ng.question.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    gaps.push({
      id: randomUUID(),
      category: ng.category,
      description: ng.description,
      severity: ng.severity,
      question: ng.question,
      status: 'open',
      answer: null,
      source: ng.source,
      conflictsWith: ng.conflictsWith ?? null,
      createdAt: now,
      resolvedAt: null,
    })
  }

  const prd = res.prd
    ? {
        markdown: res.prd.markdown,
        openQuestions: res.prd.openQuestions,
        assumptions: res.prd.assumptions,
        version: (state.prd?.version ?? 0) + 1,
        generatedAt: now,
      }
    : state.prd

  const score = computeWorkspaceScore(gaps)
  return {
    ...state,
    gaps,
    prd,
    readinessScore: score,
    readinessLabel: getScoreLabel(score),
    lastActiveAt: now,
  }
}
