// tests/lib/normalize-prd.test.ts
import { describe, it, expect } from 'vitest'
import { normalizePrd } from '@/lib/analysis/normalize-prd'

describe('normalizePrd', () => {
  it('passes through the contract shape unchanged', () => {
    const out = normalizePrd({ markdown: '# PRD', openQuestions: ['Q1'], assumptions: ['A1'] })
    expect(out).toEqual({ markdown: '# PRD', openQuestions: ['Q1'], assumptions: ['A1'] })
  })

  it('returns null for null/non-object input', () => {
    expect(normalizePrd(null)).toBeNull()
    expect(normalizePrd(undefined)).toBeNull()
    expect(normalizePrd('nope')).toBeNull()
  })

  it('coerces openQuestions objects {question,impact,priority} into strings', () => {
    const out = normalizePrd({
      markdown: '# PRD',
      openQuestions: [
        { id: 'OQ-1', question: 'Limit per tier?', impact: 'UX', priority: 'high' },
        { question: 'Refund policy?' },
      ],
      assumptions: [],
    })
    expect(out?.openQuestions).toEqual(['Limit per tier? (high)', 'Refund policy?'])
  })

  it('synthesizes markdown from a structured epics[] PRD when markdown is missing (real model drift)', () => {
    // This is the exact shape the live model returned during the smoke test.
    const out = normalizePrd({
      title: 'Fitur Top-Up Saldo',
      readinessScore: '70/100',
      epics: [
        {
          id: 'EPIC-001',
          title: 'Top-Up via Midtrans',
          description: 'User menambah saldo lewat Midtrans.',
          userStories: [
            {
              id: 'US-001',
              title: 'User memilih nominal',
              asA: 'user dompet digital',
              iWant: 'memasukkan nominal top-up',
              soThat: 'saldo bertambah',
              acceptanceCriteria: [
                'Given form terbuka, When nominal < Rp 10.000, Then tampilkan error',
              ],
            },
          ],
        },
      ],
      openQuestions: [{ question: 'Limit per tier?', priority: 'medium' }],
      assumptions: ['Midtrans sudah terintegrasi'],
      technicalNotes: ['Validasi signature webhook'],
    })
    expect(out).not.toBeNull()
    expect(out!.markdown).toContain('# Fitur Top-Up Saldo')
    expect(out!.markdown).toContain('## Top-Up via Midtrans')
    expect(out!.markdown).toContain('### User memilih nominal')
    expect(out!.markdown).toContain('Acceptance Criteria')
    expect(out!.markdown).toContain('Given form terbuka')
    expect(out!.openQuestions).toEqual(['Limit per tier? (medium)'])
    expect(out!.assumptions).toEqual([
      'Midtrans sudah terintegrasi',
      'Catatan teknis: Validasi signature webhook',
    ])
  })

  it('returns null when the object has no usable content', () => {
    expect(normalizePrd({ foo: 'bar' })).toBeNull()
    expect(normalizePrd({ markdown: '', openQuestions: [], assumptions: [] })).toBeNull()
  })
})
