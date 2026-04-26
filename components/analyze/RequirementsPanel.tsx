'use client'

import { RequirementsResult } from '@/types'
import { RequirementsExport } from './RequirementsExport'

interface RequirementsPanelProps {
  requirements: RequirementsResult | null
  isLoading: boolean
  onRetry?: () => void
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
          <div className="ml-4 mt-2 flex flex-col gap-2">
            {[1, 2].map((j) => (
              <div key={j} className="h-3 w-4/6 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function RequirementsPanel({ requirements, isLoading, onRetry }: RequirementsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Membuat requirements...</p>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!requirements) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-center text-sm text-gray-400">
          Requirements akan muncul setelah kamu klik Finalize
        </p>
      </div>
    )
  }

  if (requirements.epics.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Tidak ada requirement yang dihasilkan. Coba ulangi sesi refinement.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="self-start rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
          >
            ← Kembali ke Refinement
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Export Requirements
        </h3>
        <RequirementsExport requirements={requirements} />
      </div>

      <div className="flex flex-col gap-6">
        {requirements.epics.map((epic, epicIdx) => (
          <div key={epicIdx} className="flex flex-col gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">{epic.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{epic.description}</p>
            </div>

            <div className="flex flex-col gap-3 ml-3">
              {epic.stories.map((story, storyIdx) => (
                <div
                  key={storyIdx}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-800">{story.title}</p>
                  {story.description && (
                    <p className="mt-1 text-xs text-gray-500">{story.description}</p>
                  )}
                  {story.acceptanceCriteria.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Acceptance Criteria
                      </p>
                      <ul className="flex flex-col gap-1">
                        {story.acceptanceCriteria.map((ac, acIdx) => (
                          <li key={acIdx} className="flex gap-2 text-xs text-gray-600">
                            <span className="text-indigo-400 mt-px">✓</span>
                            <span>{ac}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
