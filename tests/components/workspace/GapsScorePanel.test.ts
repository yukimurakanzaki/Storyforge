// tests/components/workspace/GapsScorePanel.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GapsScorePanel } from '@/components/analyze/workspace/GapsScorePanel'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return { id: 'g1', category: 'functional', description: 'd', severity: 'high', question: 'Siapa approver?',
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null, ...p }
}
const noop = () => {}

describe('GapsScorePanel', () => {
  it('shows the score with a visible band color and the open question + actions', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({})], score: 85, label: 'Siap', isAnalyzing: false, onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('85')
    expect(html).toContain('text-teal-600')         // visible score color
    expect(html).toContain('Siapa approver?')
    expect(html).toContain('Di luar scope')          // dismiss action label
    expect(html).not.toMatch(/class="[^"]*bg-white[^"]*text-white/)
  })

  it('renders a constraint_conflict gap with its conflictsWith note', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({ category: 'constraint_conflict', conflictsWith: 'storage: S3', question: 'Pakai SFTP?' })],
      score: 85, label: 'Siap', isAnalyzing: false, onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('storage: S3')
  })

  it('shows resolved gaps as closed (answered)', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({ status: 'answered', answer: 'Branch manager' })], score: 100, label: 'Siap', isAnalyzing: false, onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('Branch manager')
  })

  it('shows a pending analysis state instead of a numeric score while Claude is responding', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [], score: 100, label: 'Siap', isAnalyzing: true, onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('Menganalisis')
    expect(html).toContain('Score akan diperbarui')
    expect(html).toContain('animate-pulse')
    expect(html).not.toContain('>100<')
  })
})
