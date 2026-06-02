import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OutputPanelV2 } from '@/components/analyze/OutputPanelV2'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'

const result: EnhancedAnalysisResult = {
  gapList: [{ category: 'Duplikasi aksi', description: 'Belum jelas.', severity: 'high' }],
  clarificationQuestions: ['Apa yang terjadi kalau user klik dua kali?'],
  readinessScore: 76,
  readinessLabel: 'Perlu Klarifikasi',
  scoreComponents: {
    kelengkapanAlur: { score: 80, explanation: 'Alur cukup jelas.' },
    kesiapanSprint: { score: 70, explanation: 'Ada skenario yang perlu ditanya.' },
    kejelasanRequirement: { score: 75, explanation: 'Requirement cukup jelas.' },
    konteksBisnis: { score: 80, explanation: 'Konteks cukup lengkap.' },
    topActions: ['Lengkapi skenario gagal.'],
  },
  ringkasanTemuan: {
    criticalGaps: [{ text: 'Belum jelas apa yang terjadi jika user klik dua kali.', severity: 'high', source: 'storyforge' }],
    questionsToAsk: [{ text: 'Apa yang terjadi kalau user klik dua kali?', severity: 'high', source: 'storyforge' }],
    requirementsToAdd: [{ text: 'Sistem harus mencegah data ganda.', severity: 'high', source: 'storyforge' }],
    totalNewFindings: 1,
  },
  gapCards: [
    {
      id: 'gap-1',
      yangBelumJelas: 'Belum jelas apa yang terjadi jika user klik dua kali.',
      kenapaPenting: 'User bisa membuat data ganda.',
      pertanyaanUntukTim: 'Apa yang terjadi kalau user klik dua kali?',
      usulanRequirement: 'Sistem harus mencegah data ganda.',
      category: 'Duplikasi aksi',
      severity: 'high',
      source: 'storyforge',
      brdReference: null,
    },
  ],
  journeyMap: {
    title: 'Submit formulir',
    nodes: [
      { id: 'start', label: 'User membuka form', status: 'explicit' },
      { id: 'submit', label: 'User klik Submit', status: 'explicit' },
      { id: 'error', label: 'Sistem menangani aksi ganda', status: 'missing' },
    ],
    edges: [
      { from: 'start', to: 'submit', pathType: 'happy' },
      { from: 'submit', to: 'error', pathType: 'missing' },
    ],
    multiFlowNote: null,
  },
  version: 2,
}

describe('OutputPanelV2', () => {
  it('renders the v2 PM-facing sections', () => {
    const html = renderToStaticMarkup(createElement(OutputPanelV2, { result }))

    expect(html).toContain('Hasil Review BRD')
    expect(html).toContain('Readiness Score')
    expect(html).toContain('Ringkasan Temuan')
    expect(html).toContain('Langkah berikutnya')
    expect(html).toContain('Salin Semua Pertanyaan')
    expect(html).toContain('Peta Perjalanan')
    expect(html).toContain('Detail temuan')
  })

  it('renders the honest no-gaps message when there are no gap cards', () => {
    const noGapHtml = renderToStaticMarkup(
      createElement(OutputPanelV2, {
        result: {
          ...result,
          gapCards: [],
          gapList: [],
          clarificationQuestions: [],
          readinessScore: 90,
          readinessLabel: 'Siap',
        },
      })
    )

    expect(noGapHtml).toContain('Belum ada gap besar yang terdeteksi')
    expect(noGapHtml).toContain('Peta Perjalanan')
    expect(noGapHtml).toContain('Submit formulir')
  })

  it('renders severity labels in Bahasa Indonesia', () => {
    const html = renderToStaticMarkup(createElement(OutputPanelV2, { result }))

    expect(html).toContain('Tinggi')
    expect(html).not.toContain('>High<')
    expect(html).not.toContain('>high<')
  })
})
