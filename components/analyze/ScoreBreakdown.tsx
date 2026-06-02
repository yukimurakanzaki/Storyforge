'use client'

import type { ScoreComponents } from '@/types/analysis-v2'

interface ScoreBreakdownProps {
  readinessScore: number
  readinessLabel: string
  scoreComponents: ScoreComponents
}

const COMPONENT_LABELS: Array<[keyof Omit<ScoreComponents, 'topActions'>, string, string]> = [
  ['kelengkapanAlur', 'Kelengkapan Alur', '30%'],
  ['kesiapanSprint', 'Kesiapan untuk Sprint', '25%'],
  ['kejelasanRequirement', 'Kejelasan Requirement', '25%'],
  ['konteksBisnis', 'Konteks Bisnis', '20%'],
]

function scoreTone(score: number) {
  if (score >= 80) return 'text-teal-700 bg-teal-50 border-teal-200'
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function barColor(score: number) {
  if (score >= 80) return 'bg-teal-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export function ScoreBreakdown({
  readinessScore,
  readinessLabel,
  scoreComponents,
}: ScoreBreakdownProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">Readiness Score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-gray-950">{readinessScore}</span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(readinessScore)}`}>
          {readinessLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {COMPONENT_LABELS.map(([key, label, weight]) => {
          const component = scoreComponents[key]
          return (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">Bobot {weight}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-700">
                  {component.score}/100
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${barColor(component.score)}`}
                  style={{ width: `${Math.max(0, Math.min(100, component.score))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">{component.explanation}</p>
            </div>
          )
        })}
      </div>

      {readinessScore < 80 && scoreComponents.topActions.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Perbaikan paling berdampak</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-amber-900">
            {scoreComponents.topActions.slice(0, 3).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
