// tests/components/workspace/WorkspaceSidebar.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SidebarView } from '@/components/analyze/workspace/WorkspaceSidebar'

describe('SidebarView', () => {
  const sessions = [{ session_id: 's1', title: 'Upload Dokumen', last_active_at: '2026-06-03', readiness_score: 85 }]
  const html = renderToStaticMarkup(createElement(SidebarView, {
    sessions, activeSessionId: 's1', onNew: () => {}, onOpen: () => {},
  }))
  it('renders New analysis with a visible label on the dark sidebar', () => {
    expect(html).toContain('Analisis Baru')
    expect(html).toContain('bg-gray-950')   // dark sidebar
    expect(html).toContain('text-gray')     // light/grey text on dark — never text-gray-950 here
    expect(html).not.toContain('text-gray-950')
  })
  it('lists recent sessions by title', () => {
    expect(html).toContain('Upload Dokumen')
  })
})
