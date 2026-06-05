// tests/components/workspace/ArtifactPanel.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArtifactPanel } from '@/components/analyze/workspace/ArtifactPanel'

const wsBase = {
  state: { gaps: [], readinessScore: 100, readinessLabel: 'Siap', prd: null } as any,
  activeTab: 'gaps' as const, setActiveTab: () => {}, answerGap: () => {}, dismissGap: () => {}, generatePrd: () => {},
}

describe('ArtifactPanel', () => {
  it('marks the active tab distinctly from the inactive one (not color-only invisible)', () => {
    const html = renderToStaticMarkup(createElement(ArtifactPanel, { ws: wsBase as any }))
    expect(html).toContain('border-teal-600') // active tab underline
    expect(html).toContain('Gaps')
    expect(html).toContain('PRD')
  })
})
