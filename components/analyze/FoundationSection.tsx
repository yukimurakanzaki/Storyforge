'use client'
import { useState } from 'react'

type Gap = {
  category: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

type QAEntry = {
  question: string
  answer: string
  round: number
}

export type FoundationData = {
  brd_summary: string
  gap_list: Gap[]
  readiness_score: number
  readiness_label: string
  qa_log: QAEntry[]
  assumptions: string[]
  out_of_scope: string[]
}

type Props = {
  data: FoundationData
}

const SEVERITY_COLORS = {
  high: 'text-red-400 bg-red-900/30 border-red-800',
  medium: 'text-amber-400 bg-amber-900/30 border-amber-800',
  low: 'text-slate-400 bg-slate-800 border-slate-700',
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? 'text-teal-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

export function FoundationSection({ data }: Props) {
  const [qaOpen, setQaOpen] = useState(false)

  return (
    <div className="space-y-5">
      {/* Readiness Score */}
      <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
        <div className={`text-4xl font-bold ${SCORE_COLOR(data.readiness_score)}`}>
          {data.readiness_score}
        </div>
        <div>
          <div className="text-slate-100 font-semibold">{data.readiness_label}</div>
          <div className="text-slate-500 text-xs">Readiness Score / 100</div>
        </div>
      </div>

      {/* BRD Summary */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Ringkasan BRD</div>
        <p className="text-slate-300 text-sm leading-relaxed">{data.brd_summary}</p>
      </div>

      {/* Gap List */}
      {data.gap_list.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Gap ({data.gap_list.length})
          </div>
          <div className="space-y-2">
            {data.gap_list.map((gap, i) => (
              <div key={i} className={`border rounded-lg px-3 py-2 text-sm ${SEVERITY_COLORS[gap.severity]}`}>
                <span className="font-medium">[{gap.category}]</span> {gap.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {data.assumptions.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Asumsi AI ({data.assumptions.length})
          </div>
          <ul className="space-y-1">
            {data.assumptions.map((a, i) => (
              <li key={i} className="text-slate-400 text-sm flex gap-2">
                <span className="text-amber-500 flex-shrink-0">⚠</span> {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Out of Scope */}
      {data.out_of_scope.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Di Luar Scope ({data.out_of_scope.length})
          </div>
          <ul className="space-y-1">
            {data.out_of_scope.map((item, i) => (
              <li key={i} className="text-slate-500 text-sm flex gap-2">
                <span className="flex-shrink-0">—</span> {item}
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
            className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1 hover:text-slate-300 transition-colors"
          >
            Log Q&A ({data.qa_log.length} pertanyaan) {qaOpen ? '▲' : '▼'}
          </button>
          {qaOpen && (
            <div className="mt-2 space-y-3">
              {data.qa_log.map((entry, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Ronde {entry.round}</div>
                  <div className="text-slate-300 text-sm font-medium mb-1">{entry.question}</div>
                  <div className="text-slate-400 text-sm">{entry.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
