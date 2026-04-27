'use client'

import type { InvestCriteria, UserStory } from '@/types'

interface UserStoryCardProps {
  story: UserStory
  index: number
}

const INVEST_LABELS: Record<keyof InvestCriteria, string> = {
  independent: 'I — Independent',
  negotiable: 'N — Negotiable',
  valuable: 'V — Valuable',
  estimable: 'E — Estimable',
  small: 'S — Small',
  testable: 'T — Testable',
}

export function UserStoryCard({ story, index }: UserStoryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div>
          <h4 className="text-base font-semibold text-gray-900">{story.title}</h4>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">Sebagai</span> {story.asA},{' '}
            <span className="font-medium">ingin</span> {story.iWant},{' '}
            <span className="font-medium">agar</span> {story.soThat}.
          </p>
        </div>
      </div>

      {/* INVEST */}
      <section>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">INVEST</h5>
        <ul className="flex flex-col gap-1.5">
          {(Object.keys(INVEST_LABELS) as (keyof InvestCriteria)[]).map((key) => (
            <li key={key} className="flex gap-2 text-sm">
              <span className="w-28 shrink-0 font-medium text-gray-500">{INVEST_LABELS[key]}</span>
              <span className="text-gray-700">{story.investNotes[key]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Acceptance Criteria (Gherkin) */}
      <section>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Acceptance Criteria
        </h5>
        <div className="flex flex-col gap-3">
          {story.acceptanceCriteria.map((scenario, sIdx) => (
            <div key={sIdx} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-medium text-gray-800 mb-2">{scenario.title}</p>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <span className="w-12 shrink-0 font-semibold text-indigo-600">Given</span>
                  <span className="text-gray-700">{scenario.given.join('; ')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-12 shrink-0 font-semibold text-indigo-600">When</span>
                  <span className="text-gray-700">{scenario.when.join('; ')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-12 shrink-0 font-semibold text-indigo-600">Then</span>
                  <span className="text-gray-700">{scenario.then.join('; ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Field Context Table (conditional) */}
      {story.fieldContextTable && story.fieldContextTable.length > 0 && (
        <section>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Field Context
          </h5>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-4 font-medium text-gray-600">Field</th>
                  <th className="text-left py-1.5 pr-4 font-medium text-gray-600">Deskripsi</th>
                  <th className="text-left py-1.5 pr-4 font-medium text-gray-600">Tipe Data</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Contoh</th>
                </tr>
              </thead>
              <tbody>
                {story.fieldContextTable.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-4 font-mono text-xs text-indigo-700">{row.fieldName}</td>
                    <td className="py-1.5 pr-4 text-gray-700">{row.description}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{row.dataType}</td>
                    <td className="py-1.5 text-gray-500">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
