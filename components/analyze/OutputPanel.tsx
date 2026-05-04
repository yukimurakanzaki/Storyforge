'use client'

import type { AnalysisResult } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { READINESS_LABELS } from '@/lib/constants'
import { GapItem as GapListItem } from '@/components/analyze/GapItem'

interface OutputPanelProps {
  result?: AnalysisResult
  isLoading?: boolean
  onGenerate?: () => void
  isGenerating?: boolean
  canSubmitFeedback?: boolean
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

export function OutputPanel({
  result,
  isLoading = false,
  onGenerate,
  isGenerating = false,
  canSubmitFeedback = false,
}: OutputPanelProps) {
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
  const isReadyToGenerate = result.readinessScore >= 80

  function handleGenerateClick() {
    if (!onGenerate) return
    onGenerate()
  }

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
              <GapListItem
                key={idx}
                gap={gap}
                index={idx}
                analysisId={result.id}
                canSubmitFeedback={canSubmitFeedback}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Clarification Questions */}
      {result.clarificationQuestions.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Pertanyaan Terbuka ({result.clarificationQuestions.length})
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

      {/* Generate Button */}
      {onGenerate && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            title={isReadyToGenerate ? '' : 'Readiness masih rendah — kamu tetap bisa generate'}
            className={[
              'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isReadyToGenerate
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-amber-500 text-white hover:bg-amber-600',
            ].join(' ')}
          >
            {isGenerating ? 'Membuat User Stories...' : 'Generate User Stories'}
          </button>
          {!isReadyToGenerate && (
            <p className="mt-1.5 text-center text-xs text-amber-600">
              Readiness {result.readinessScore}/100 — tambah klarifikasi untuk hasil lebih baik
            </p>
          )}
        </div>
      )}
    </div>
  )
}
