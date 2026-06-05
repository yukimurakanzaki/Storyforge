// tests/lib/workspace-store.test.ts
import { describe, it, expect } from 'vitest'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'

describe('rowToState', () => {
  it('reads new-format columns directly', () => {
    const row = {
      session_id: 's1', title: 'Judul', gaps: [{ id: 'g1', category: 'functional', description: 'd',
        severity: 'high', question: 'q', status: 'open', answer: null, source: 'brd',
        conflictsWith: null, createdAt: 'x', resolvedAt: null }],
      prd: null, messages: [{ role: 'user', content: 'hi' }], readiness_score: 85, readiness_label: 'Siap',
      context_summary: '', summarized_up_to: 0, last_active_at: 'now',
    }
    const s = rowToState(row)
    expect(s.title).toBe('Judul')
    expect(s.gaps).toHaveLength(1)
    expect(s.readinessScore).toBe(85)
  })

  it('falls back to legacy gap_list + clarification_questions when gaps is empty', () => {
    const row = {
      session_id: 's2', title: null, gaps: [], prd: null, messages: [],
      gap_list: [{ category: 'Role Definition', description: 'Approver tak jelas', severity: 'high' }],
      clarification_questions: ['Siapa approver?'],
      requirements: null, brd_text: 'Judul BRD\nbaris kedua',
      readiness_score: 50, readiness_label: 'Perlu Klarifikasi', last_active_at: 'now',
    }
    const s = rowToState(row)
    expect(s.gaps.length).toBeGreaterThanOrEqual(2) // 1 from clarification + 1 from gap_list
    expect(s.gaps.every(g => g.status === 'open')).toBe(true)
    expect(s.title).toBe('Judul BRD')               // derived from brd_text first line
  })
})

describe('stateToRow', () => {
  it('maps state back to column names', () => {
    const row = stateToRow({
      sessionId: 's1', title: 't', brdText: 'Requirement asli', gaps: [], readinessScore: 90, readinessLabel: 'Siap',
      prd: null, messages: [], contextSummary: 'sum', summarizedUpTo: 2, lastActiveAt: 'now',
    }, 'user-1', 'proj-1')
    expect(row.session_id).toBe('s1')
    expect(row.user_id).toBe('user-1')
    expect(row.project_id).toBe('proj-1')
    expect(row.brd_text).toBe('Requirement asli')   // NOT NULL column satisfied
    expect(row.readiness_score).toBe(90)
    expect(row.summarized_up_to).toBe(2)
  })
})
