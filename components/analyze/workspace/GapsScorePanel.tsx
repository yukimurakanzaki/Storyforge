// components/analyze/workspace/GapsScorePanel.tsx
'use client'
import type { WorkspaceGap } from '@/types/workspace'
import { partitionGaps, scoreColor } from '@/lib/workspace/client-state'
import { GapRow } from './GapRow'

export function GapsScorePanel({ gaps, score, label, onAnswer, onDismiss }: {
  gaps: WorkspaceGap[]
  score: number
  label: string
  onAnswer: (id: string, answer: string) => void
  onDismiss: (id: string) => void
}) {
  const { open, resolved } = partitionGaps(gaps)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Readiness Score</p>
          <p className="text-sm text-gray-700">{label}</p>
        </div>
        <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
      </div>

      {open.length === 0 && resolved.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada gap. Tempel requirement di chat untuk mulai.</p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perlu dijawab ({open.length})</p>
          {open.map((g) => <GapRow key={g.id} gap={g} onAnswer={onAnswer} onDismiss={onDismiss} />)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sudah selesai ({resolved.length})</p>
          {resolved.map((g) => <GapRow key={g.id} gap={g} onAnswer={onAnswer} onDismiss={onDismiss} />)}
        </div>
      )}
    </div>
  )
}
