'use client'
import { useState } from 'react'
import { FoundationData, Gap, QAEntry } from '@/types'

export type { FoundationData }

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-gray-200 bg-gray-50 text-gray-600',
}

type Props = {
  data: FoundationData
}

export function FoundationSection({ data }: Props) {
  const [qaOpen, setQaOpen] = useState(false)

  const scoreColor =
    data.readiness_score >= 80
      ? 'text-teal-600'
      : data.readiness_score >= 50
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div className="space-y-5">
      {/* Readiness score */}
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold ${scoreColor}`}>{data.readiness_score}</div>
        <div>
          <div className="text-gray-700 font-medium text-sm">{data.readiness_label}</div>
          <div className="text-gray-400 text-xs">Readiness Score / 100</div>
        </div>
      </div>

      {/* BRD Summary */}
      {data.brd_summary && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Ringkasan BRD</div>
          <p className="text-gray-700 text-sm leading-relaxed">{data.brd_summary}</p>
        </div>
      )}

      {/* Gap list */}
      {data.gap_list.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Gap ({data.gap_list.length})
          </div>
          <div className="space-y-2">
            {data.gap_list.map((gap: Gap, i: number) => (
              <div
                key={`${gap.category}-${gap.severity}-${i}`}
                className={`border rounded-lg px-3 py-2 text-sm ${SEVERITY_COLORS[gap.severity] ?? SEVERITY_COLORS.low}`}
              >
                <span className="font-medium">[{gap.category}]</span> {gap.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {data.assumptions.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Asumsi AI ({data.assumptions.length})
          </div>
          <ul className="space-y-1">
            {data.assumptions.map((a: string, i: number) => (
              <li key={`assumption-${i}`} className="text-gray-500 text-sm flex gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" className="text-amber-500 flex-shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Out of Scope */}
      {data.out_of_scope.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Di Luar Scope ({data.out_of_scope.length})
          </div>
          <ul className="space-y-1">
            {data.out_of_scope.map((item: string, i: number) => (
              <li key={`oos-${i}`} className="text-gray-500 text-sm flex gap-2">
                <span className="flex-shrink-0">—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Q&A Log */}
      {data.qa_log.length > 0 && (
        <div>
          <button
            onClick={() => setQaOpen(o => !o)}
            aria-expanded={qaOpen}
            aria-controls="qa-log-content"
            id="qa-log-toggle"
            className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <svg
              aria-hidden="true"
              className={`w-3 h-3 transition-transform duration-150 ${qaOpen ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd" />
            </svg>
            Log Q&A ({data.qa_log.length} pertanyaan)
          </button>
          {qaOpen && (
            <div id="qa-log-content" className="mt-2 space-y-3">
              {data.qa_log.map((entry: QAEntry, i: number) => (
                <div key={`qa-${entry.round}-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Ronde {entry.round}</div>
                  <div className="text-gray-800 text-sm font-medium mb-1">{entry.question}</div>
                  <div className="text-gray-600 text-sm">{entry.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}