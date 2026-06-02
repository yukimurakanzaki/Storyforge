'use client'

import { useState } from 'react'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'
import { NEXT_ACTION_DEFAULT, NEXT_ACTION_LABEL, NO_GAPS_MESSAGE, SECTION_LABELS } from '@/lib/analysis/constants'
import { CopyActions } from './CopyActions'
import { GapCard } from './GapCard'
import { JourneyMap } from './JourneyMap'
import { RingkasanTemuanView } from './RingkasanTemuan'
import { ScoreBreakdown } from './ScoreBreakdown'

interface OutputPanelV2Props {
  result: EnhancedAnalysisResult
}

export function OutputPanelV2({ result }: OutputPanelV2Props) {
  const [expanded, setExpanded] = useState(false)
  const hasGaps = result.gapCards.length > 0
  const nextAction = result.scoreComponents.topActions[0] || NEXT_ACTION_DEFAULT

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">{SECTION_LABELS.outputPanel}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review terstruktur untuk membantu kamu siap masuk grooming.
        </p>
      </div>

      <ScoreBreakdown
        readinessScore={result.readinessScore}
        readinessLabel={result.readinessLabel}
        scoreComponents={result.scoreComponents}
      />

      {!hasGaps ? (
        <>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm leading-6 text-teal-900">{NO_GAPS_MESSAGE}</p>
          </div>
          <JourneyMap journeyMap={result.journeyMap} />
        </>
      ) : (
        <>
          <RingkasanTemuanView ringkasanTemuan={result.ringkasanTemuan} />

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-950">{NEXT_ACTION_LABEL}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">{nextAction}</p>
          </section>

          <CopyActions gapCards={result.gapCards} />
          <JourneyMap journeyMap={result.journeyMap} />

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-base font-semibold text-gray-950">
                  Detail temuan
                </span>
                <span className="text-sm text-gray-500">
                  {result.gapCards.length} temuan tersedia
                </span>
              </span>
              <span className="text-sm font-medium text-teal-700">
                {expanded ? 'Sembunyikan' : 'Lihat detail'}
              </span>
            </button>

            {expanded && (
              <div className="mt-4 space-y-3">
                {result.gapCards.map((card) => (
                  <GapCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
