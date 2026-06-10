// tests/components/workspace/EmptyState.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyState } from '@/components/analyze/workspace/EmptyState'

describe('EmptyState', () => {
  const html = renderToStaticMarkup(createElement(EmptyState, { onSend: () => {}, isSending: false }))

  it('does NOT offer a sample/example BRD', () => {
    expect(html.toLowerCase()).not.toContain('contoh')
    expect(html.toLowerCase()).not.toContain('sample')
  })
  it('renders a visible primary send button (teal bg + white text, not invisible)', () => {
    expect(html).toContain('bg-teal-600')
    expect(html).toContain('text-white')
    expect(html).not.toMatch(/class="[^"]*bg-white[^"]*text-white/) // never white-on-white
  })
  it('renders the composer textarea', () => {
    expect(html).toContain('<textarea')
  })
})
