// tests/lib/workspace-reducer.test.ts
import { describe, it, expect } from 'vitest'
import { applyTurn } from '@/lib/analysis/workspace-reducer'
import type { WorkspaceState, ModelTurnResponse, WorkspaceGap } from '@/types/workspace'

const NOW = '2026-06-03T00:00:00.000Z'

function baseState(gaps: WorkspaceGap[] = []): WorkspaceState {
  return {
    sessionId: 's1', title: 't', brdText: 'b', gaps, readinessScore: 100, readinessLabel: 'Siap',
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: NOW,
  }
}
function openGap(id: string, severity: WorkspaceGap['severity'] = 'high'): WorkspaceGap {
  return { id, category: 'functional', description: 'd', severity, question: `q-${id}`,
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: NOW, resolvedAt: null }
}
function emptyRes(p: Partial<ModelTurnResponse> = {}): ModelTurnResponse {
  return { intent: 'general_chat', assistantMessage: 'ok', newGaps: [], resolvedGapIds: [],
    gapAnswers: {}, outOfScopeGapIds: [], prd: null, ...p }
}

describe('applyTurn', () => {
  it('adds new gaps with generated ids and recomputes score', () => {
    const next = applyTurn(baseState(), emptyRes({
      intent: 'new_or_expanded_requirement',
      newGaps: [{ category: 'edge_case', description: 'd', severity: 'high', question: 'Apa yang terjadi saat offline?', source: 'brd' }],
    }), NOW)
    expect(next.gaps).toHaveLength(1)
    expect(next.gaps[0].id).toBeTruthy()
    expect(next.gaps[0].status).toBe('open')
    expect(next.readinessScore).toBe(85)
    expect(next.readinessLabel).toBe('Siap')
  })

  it('does not add a duplicate gap (same question, case-insensitive)', () => {
    const s = baseState([openGap('g1')])
    s.gaps[0].question = 'Siapa approver?'
    const next = applyTurn(s, emptyRes({
      newGaps: [{ category: 'role', description: 'd', severity: 'high', question: 'siapa approver?', source: 'chat' }],
    }), NOW)
    expect(next.gaps).toHaveLength(1)
  })

  it('marks resolved gaps answered with their answer and raises the score', () => {
    const next = applyTurn(baseState([openGap('g1')]), emptyRes({
      intent: 'answer_pending_question',
      resolvedGapIds: ['g1'], gapAnswers: { g1: 'Branch manager' },
    }), NOW)
    expect(next.gaps[0].status).toBe('answered')
    expect(next.gaps[0].answer).toBe('Branch manager')
    expect(next.gaps[0].resolvedAt).toBe(NOW)
    expect(next.readinessScore).toBe(100)
  })

  it('marks out-of-scope gaps and raises the score', () => {
    const next = applyTurn(baseState([openGap('g1')]), emptyRes({ outOfScopeGapIds: ['g1'] }), NOW)
    expect(next.gaps[0].status).toBe('out_of_scope')
    expect(next.readinessScore).toBe(100)
  })

  it('stores a constraint_conflict gap with conflictsWith', () => {
    const next = applyTurn(baseState(), emptyRes({
      newGaps: [{ category: 'constraint_conflict', description: 'pakai SFTP', severity: 'high',
        question: 'Requirement pakai SFTP, padahal default S3 — sengaja?', source: 'brd', conflictsWith: 'storage: S3' }],
    }), NOW)
    expect(next.gaps[0].category).toBe('constraint_conflict')
    expect(next.gaps[0].conflictsWith).toBe('storage: S3')
  })

  it('creates/updates the PRD and bumps version when prd is present', () => {
    const next = applyTurn(baseState(), emptyRes({
      intent: 'command',
      prd: { markdown: '# PRD', openQuestions: ['Q1'], assumptions: ['A1'] },
    }), NOW)
    expect(next.prd?.version).toBe(1)
    expect(next.prd?.markdown).toBe('# PRD')
    const again = applyTurn(next, emptyRes({ intent: 'command', prd: { markdown: '# PRD v2', openQuestions: [], assumptions: [] } }), NOW)
    expect(again.prd?.version).toBe(2)
  })
})
