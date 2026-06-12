// tests/lib/client-state.test.ts
import { describe, it, expect } from 'vitest'
import { emptyClientState, withOptimisticUserMessage, partitionGaps, scoreColor, resolvedQuestions } from '@/lib/workspace/client-state'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return { id: 'g', category: 'functional', description: 'd', severity: 'medium', question: 'q',
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null, ...p }
}

describe('client-state', () => {
  it('emptyClientState seeds a usable state', () => {
    const s = emptyClientState('s1')
    expect(s.sessionId).toBe('s1')
    expect(s.gaps).toEqual([])
    expect(s.readinessScore).toBe(100)
  })

  it('withOptimisticUserMessage appends a user message (creating state if null)', () => {
    const s = withOptimisticUserMessage(null, 's1', 'halo')
    expect(s.messages).toEqual([{ role: 'user', content: 'halo' }])
    const s2 = withOptimisticUserMessage(s, 's1', 'lagi')
    expect(s2.messages.map(m => m.content)).toEqual(['halo', 'lagi'])
  })

  it('partitionGaps splits open vs resolved', () => {
    const { open, resolved } = partitionGaps([gap({ id: 'a', status: 'open' }), gap({ id: 'b', status: 'answered' }), gap({ id: 'c', status: 'out_of_scope' })])
    expect(open.map(g => g.id)).toEqual(['a'])
    expect(resolved.map(g => g.id)).toEqual(['b', 'c'])
  })

  it('scoreColor returns a visible (non-background) token per band', () => {
    expect(scoreColor(85)).toBe('text-teal-600')
    expect(scoreColor(60)).toBe('text-amber-600')
    expect(scoreColor(30)).toBe('text-red-600')
  })

  it('resolvedQuestions maps ids to their question text from the pre-update gaps', () => {
    const gaps = [gap({ id: 'a', question: 'Siapa approver?' }), gap({ id: 'b', question: 'Batas waktu?' })]
    expect(resolvedQuestions(gaps, ['b'])).toEqual(['Batas waktu?'])
  })
})

import { resolvedQuestions as rq } from '@/lib/workspace/client-state'
describe('chat↔panel sync mapping', () => {
  it('only returns questions for the ids the server actually closed', () => {
    const gaps = [
      { id: 'a', question: 'Q-A' }, { id: 'b', question: 'Q-B' }, { id: 'c', question: 'Q-C' },
    ].map((g) => ({ ...g, category: 'functional', description: '', severity: 'low', status: 'open',
      answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null })) as any
    expect(rq(gaps, ['a', 'c'])).toEqual(['Q-A', 'Q-C'])
    expect(rq(gaps, ['zzz'])).toEqual([])
  })
})
