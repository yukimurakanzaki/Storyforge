'use client'

import { RequirementsResult } from '@/types'
import { RequirementsExport } from './RequirementsExport'
import { UserStoryCard } from './UserStoryCard'

interface RequirementsPanelProps {
  requirements: RequirementsResult | null
  isLoading: boolean
  onRetry?: () => void
  onRegenerate?: () => void
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

export function RequirementsPanel({
  requirements,
  isLoading,
  onRetry,
  onRegenerate,
}: RequirementsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Membuat user stories...</p>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!requirements) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-center text-sm text-gray-400">
          User stories akan muncul setelah kamu klik Generate
        </p>
      </div>
    )
  }

  if (requirements.userStories.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Tidak ada user story yang dihasilkan. Coba ulangi sesi refinement.
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
      {/* Export + Regenerate controls */}
      <div className="border-b border-gray-100 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            User Stories ({requirements.userStories.length})
          </h3>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>
        <RequirementsExport requirements={requirements} />
      </div>

      {/* Story cards */}
      <div className="flex flex-col gap-4">
        {requirements.userStories.map((story, idx) => (
          <UserStoryCard key={idx} story={story} index={idx} />
        ))}
      </div>
    </div>
  )
}
