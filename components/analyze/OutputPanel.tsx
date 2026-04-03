'use client'

import { AnalysisResult, GapItem } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { READINESS_LABELS } from '@/lib/constants'

interface OutputPanelProps {
  result?: AnalysisResult
  isLoading?: boolean
}

function getReadinessColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

function getReadinessLabel(score: number): string {
  const thresholds = [80, 50, 0] as const
  for (const t of thresholds) {
    if (score >= t) return READINESS_LABELS[t].label
  }
  return READINESS_LABELS[0].label
}

function severityColor(severity: GapItem['severity']): 'red' | 'yellow' | 'gray' {
  if (severity === 'high') return 'red'
  if (severity === 'medium') return 'yellow'
  return 'gray'
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
          <div className="h-3 w-4/6 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function OutputPanel({ result, isLoading = false }: OutputPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-center text-sm text-gray-400">
          Output analisis akan muncul di sini
        </p>
      </div>
    )
  }

  const readinessColor = getReadinessColor(result.readinessScore)
  const readinessLabel = getReadinessLabel(result.readinessScore)

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Readiness Score */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <span className="text-sm font-medium text-gray-600">Kesiapan BRD</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-800">
            {result.readinessScore}%
          </span>
          <Badge
            label={readinessLabel}
            color={readinessColor}
            className="text-sm px-3 py-1"
          />
        </div>
      </div>

      {/* Gap List */}
      {result.gapList.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Gap yang Ditemukan ({result.gapList.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {result.gapList.map((gap, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Badge label={gap.severity} color={severityColor(gap.severity)} />
                  <span className="text-xs font-medium text-gray-500">{gap.category}</span>
                </div>
                <p className="text-sm text-gray-700">{gap.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Clarification Questions */}
      {result.clarificationQuestions.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Pertanyaan Klarifikasi
          </h3>
          <ol className="flex flex-col gap-2 list-decimal list-inside">
            {result.clarificationQuestions.map((q, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {q}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
