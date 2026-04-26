import { describe, it, expect } from 'vitest'
import type { QAAnswer } from '@/types'

function buildQAContext(
  questions: string[],
  qaAnswers: QAAnswer[]
): string {
  if (questions.length === 0) return ''
  const lines = questions.map((q, i) => {
    const qa = qaAnswers[i]
    if (!qa) return `  Pertanyaan ${i + 1}: ${q}\n  → Belum dijawab`
    if (qa.isOutOfScope) return `  Pertanyaan ${i + 1}: ${q}\n  → Di luar scope (dikecualikan)`
    if (qa.answer.trim()) return `  Pertanyaan ${i + 1}: ${q}\n  → Jawaban: ${qa.answer.trim()}`
    return `  Pertanyaan ${i + 1}: ${q}\n  → Belum dijawab`
  })
  return `JAWABAN PERTANYAAN KLARIFIKASI:\n${lines.join('\n')}`
}

describe('buildQAContext', () => {
  it('returns empty string when no questions', () => {
    expect(buildQAContext([], [])).toBe('')
  })

  it('marks unanswered questions correctly', () => {
    const result = buildQAContext(['Apa target user?'], [{ answer: '', isOutOfScope: false }])
    expect(result).toContain('Belum dijawab')
  })

  it('marks out-of-scope questions correctly', () => {
    const result = buildQAContext(['Q1'], [{ answer: '', isOutOfScope: true }])
    expect(result).toContain('Di luar scope (dikecualikan)')
  })

  it('shows answer text for answered questions', () => {
    const qa: QAAnswer = { answer: 'UMKM owner', isOutOfScope: false }
    const result = buildQAContext(['Apa target user?'], [qa])
    expect(result).toContain('UMKM owner')
    expect(result).not.toContain('Belum dijawab')
  })

  it('handles missing QAAnswer entries gracefully', () => {
    const result = buildQAContext(['Q1', 'Q2'], [{ answer: 'A1', isOutOfScope: false }])
    expect(result).toContain('Belum dijawab')
  })
})
