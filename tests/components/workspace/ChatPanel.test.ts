// tests/components/workspace/ChatPanel.test.ts
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChatPanel } from '@/components/analyze/workspace/ChatPanel'

describe('ChatPanel', () => {
  it('renders a quiet Codex-style pending indicator while waiting for the assistant', () => {
    const html = renderToStaticMarkup(createElement(ChatPanel, {
      messages: [{ role: 'user', content: 'Sistem perlu upload PDF.' }],
      isSending: true,
      lastResolved: [],
      onSend: () => {},
    }))

    expect(html).toContain('StoryForge sedang menganalisis')
    expect(html).toContain('animate-pulse')
  })
})
