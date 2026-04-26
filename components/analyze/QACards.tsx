'use client'

import { useState } from 'react'
import type { QAAnswer } from '@/types'
import { QACard } from './QACard'
import { Button } from '@/components/ui/Button'

interface QACardsProps {
  questions: string[]
  qaAnswers: QAAnswer[]
  resolvedIndices: number[]
  isLoading: boolean
  onAnswerChange: (index: number, answer: string) => void
  onOutOfScopeChange: (index: number, checked: boolean) => void
  onSubmit: () => void
}

export function QACards({
  questions,
  qaAnswers,
  resolvedIndices,
  isLoading,
  onAnswerChange,
  onOutOfScopeChange,
  onSubmit,
}: QACardsProps) {
  const [showResolved, setShowResolved] = useState(false)

  if (questions.length === 0) return null

  const resolvedSet = new Set(resolvedIndices)
  const unresolvedQuestions = questions.filter((_, i) => !resolvedSet.has(i))
  const resolvedCount = resolvedIndices.length

  const hasNewAnswers = questions.some((_, i) => {
    if (resolvedSet.has(i)) return false
    const qa = qaAnswers[i]
    return qa && (qa.isOutOfScope || qa.answer.trim().length > 0)
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Pertanyaan Klarifikasi ({unresolvedQuestions.length})
        </h3>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            {showResolved ? 'Sembunyikan' : `Sudah Dijawab (${resolvedCount})`}
          </button>
        )}
      </div>

      {/* Unresolved cards */}
      <div className="flex flex-col gap-2">
        {questions.map((q, i) =>
          resolvedSet.has(i) ? null : (
            <QACard
              key={i}
              question={q}
              index={i}
              qaAnswer={qaAnswers[i] ?? { answer: '', isOutOfScope: false }}
              onAnswerChange={onAnswerChange}
              onOutOfScopeChange={onOutOfScopeChange}
            />
          )
        )}
      </div>

      {/* Resolved accordion */}
      {showResolved && resolvedCount > 0 && (
        <div className="flex flex-col gap-2 opacity-60">
          {resolvedIndices.map((i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">
                <span className="font-medium">{i + 1}. {questions[i]}</span>
              </p>
              {qaAnswers[i]?.isOutOfScope ? (
                <p className="text-xs text-gray-400 mt-1">→ Di luar scope</p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">→ {qaAnswers[i]?.answer}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit button */}
      {unresolvedQuestions.length > 0 && (
        <Button
          variant="secondary"
          onClick={onSubmit}
          disabled={!hasNewAnswers || isLoading}
          loading={isLoading}
          className="self-start text-xs"
        >
          Submit Jawaban
        </Button>
      )}
    </div>
  )
}
