// tests/components/workspace/PrdArtifact.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrdArtifact } from '@/components/analyze/workspace/PrdArtifact'
import type { PrdDraft } from '@/types/workspace'

const prd: PrdDraft = {
  markdown: '# Epic: Upload Dokumen\n- User story 1', openQuestions: ['Siapa approver?'],
  assumptions: ['Pakai S3'], version: 2, generatedAt: '2026-06-03',
}

describe('PrdArtifact', () => {
  it('renders the PRD content, open questions and assumptions', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd, onUpdate: () => {} }))
    expect(html).toContain('Upload Dokumen')
    expect(html).toContain('Siapa approver?')
    expect(html).toContain('Pakai S3')
    expect(html).toContain('v2')
  })
  it('renders an empty-PRD prompt with a visible generate button when prd is null', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd: null, onUpdate: () => {} }))
    expect(html).toContain('bg-teal-600')
    expect(html).toContain('text-white')
    expect(html.toLowerCase()).toContain('tulis prd')
  })
  it('shows the free-tier watermark (OQ-6 copy) on generated PRD output', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd, plan: 'free', onUpdate: () => {} }))
    expect(html).toContain('Dibuat dengan StoryForge.id (Gratis)')
  })
  it('hides the watermark for pro users', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd, plan: 'pro', onUpdate: () => {} }))
    expect(html).not.toContain('Dibuat dengan StoryForge.id')
  })
})
