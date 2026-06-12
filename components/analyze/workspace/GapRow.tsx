// components/analyze/workspace/GapRow.tsx
'use client'
import { useState } from 'react'
import type { WorkspaceGap } from '@/types/workspace'

const SEV: Record<WorkspaceGap['severity'], string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600',
}

export function GapRow({ gap, onAnswer, onDismiss }: {
  gap: WorkspaceGap
  onAnswer: (id: string, answer: string) => void
  onDismiss: (id: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const resolved = gap.status !== 'open'
  return (
    <div className={`rounded-xl border p-3 ${resolved ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm ${resolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{gap.question}</p>
        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs ${SEV[gap.severity]}`}>{gap.severity}</span>
      </div>
      {gap.category === 'constraint_conflict' && gap.conflictsWith && (
        <p className="mt-1 text-xs text-red-600">⚠ Bertentangan dengan: {gap.conflictsWith}</p>
      )}
      {resolved ? (
        <p className="mt-1 text-xs text-gray-500">
          {gap.status === 'out_of_scope' ? 'Di luar scope' : `Jawaban: ${gap.answer}`}
        </p>
      ) : (
        <div className="mt-2 flex items-end gap-2">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Jawab di sini..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            onClick={() => { if (answer.trim()) { onAnswer(gap.id, answer.trim()); setAnswer('') } }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >Jawab</button>
          <button
            onClick={() => onDismiss(gap.id)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >Di luar scope</button>
        </div>
      )}
    </div>
  )
}
