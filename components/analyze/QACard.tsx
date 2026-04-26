'use client'

import type { QAAnswer } from '@/types'

interface QACardProps {
  question: string
  index: number
  qaAnswer: QAAnswer
  isResolved: boolean
  onAnswerChange: (index: number, answer: string) => void
  onOutOfScopeChange: (index: number, checked: boolean) => void
}

export function QACard({
  question,
  index,
  qaAnswer,
  isResolved,
  onAnswerChange,
  onOutOfScopeChange,
}: QACardProps) {
  if (isResolved) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-2 shadow-sm">
      <p className="text-sm font-medium text-gray-800">
        <span className="text-indigo-500 mr-1">{index + 1}.</span>
        {question}
      </p>

      <textarea
        value={qaAnswer.answer}
        onChange={(e) => onAnswerChange(index, e.target.value)}
        disabled={qaAnswer.isOutOfScope}
        rows={2}
        placeholder={qaAnswer.isOutOfScope ? 'Ditandai di luar scope' : 'Tulis jawaban kamu...'}
        className={[
          'w-full resize-none rounded-md border px-3 py-2 text-sm',
          'placeholder-gray-400 focus:outline-none focus:ring-1',
          qaAnswer.isOutOfScope
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-800 focus:border-indigo-500 focus:ring-indigo-500',
        ].join(' ')}
      />

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={qaAnswer.isOutOfScope}
          onChange={(e) => onOutOfScopeChange(index, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-500">Di luar scope</span>
      </label>
    </div>
  )
}
