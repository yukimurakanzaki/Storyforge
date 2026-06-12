// tests/lib/workspace-score.test.ts
import { describe, it, expect } from 'vitest'
import { computeWorkspaceScore } from '@/lib/analysis/workspace-score'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return {
    id: 'x', category: 'functional', description: '', severity: 'medium',
    question: 'q', status: 'open', answer: null, source: 'brd',
    conflictsWith: null, createdAt: '', resolvedAt: null, ...p,
  }
}

describe('computeWorkspaceScore', () => {
  it('is 100 when there are no gaps', () => {
    expect(computeWorkspaceScore([])).toBe(100)
  })
  it('penalises open gaps by severity', () => {
    expect(computeWorkspaceScore([gap({ severity: 'high' })])).toBe(85)
    expect(computeWorkspaceScore([gap({ severity: 'medium' })])).toBe(92)
    expect(computeWorkspaceScore([gap({ severity: 'low' })])).toBe(97)
  })
  it('ignores answered and out_of_scope gaps', () => {
    expect(computeWorkspaceScore([
      gap({ severity: 'high', status: 'answered' }),
      gap({ severity: 'high', status: 'out_of_scope' }),
    ])).toBe(100)
  })
  it('floors at 0', () => {
    const many = Array.from({ length: 10 }, () => gap({ severity: 'high' }))
    expect(computeWorkspaceScore(many)).toBe(0)
  })
})
