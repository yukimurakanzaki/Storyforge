// tests/lib/workspace-context.test.ts
import { describe, it, expect } from 'vitest'
import { needsCompaction, compactionSlice, applyCompaction, buildModelPayload } from '@/lib/analysis/workspace-context'
import type { WorkspaceState } from '@/types/workspace'

const KEEP = 12
function state(n: number): WorkspaceState {
  return {
    sessionId: 's', title: 't', brdText: '', gaps: [], readinessScore: 100, readinessLabel: 'Siap',
    prd: null, contextSummary: '', summarizedUpTo: 0, lastActiveAt: '',
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` } as const)),
  }
}

describe('compaction', () => {
  it('does not compact under the keep-verbatim threshold', () => {
    expect(needsCompaction(state(KEEP))).toBe(false)
  })
  it('compacts when verbatim messages exceed the threshold', () => {
    expect(needsCompaction(state(KEEP + 4))).toBe(true)
    expect(compactionSlice(state(KEEP + 4)).map(m => m.content)).toEqual(['m0', 'm1', 'm2', 'm3'])
  })
  it('applyCompaction appends summary and advances summarizedUpTo', () => {
    const s = applyCompaction(state(KEEP + 4), 'ringkasan lama')
    expect(s.summarizedUpTo).toBe(4)
    expect(s.contextSummary).toContain('ringkasan lama')
  })
  it('buildModelPayload sends only summary + verbatim tail and never loses gaps', () => {
    const s = applyCompaction(state(KEEP + 4), 'ringkasan')
    const payload = buildModelPayload(s, '')
    expect(payload.messages).toHaveLength(KEEP)        // only the tail
    expect(payload.messages[0].content).toBe('m4')
    expect(payload.system).toContain('ringkasan')
  })
  it('buildModelPayload injects a non-empty context block at the top', () => {
    const payload = buildModelPayload(state(2), 'KONTEKS USER: fintech')
    expect(payload.system.indexOf('KONTEKS USER: fintech')).toBeLessThan(payload.system.indexOf('STATE'))
  })
})
