'use client'

import { useState } from 'react'
import type { GapCard as GapCardType } from '@/types/analysis-v2'
import { GAP_CARD_LABELS, SEVERITY_LABELS, SOURCE_LABELS } from '@/lib/analysis/constants'
import { formatGapCardText } from '@/lib/analysis/copy-formatter'

interface GapCardProps {
  card: GapCardType
}

function severityClasses(severity: GapCardType['severity']) {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700'
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-gray-200 bg-gray-50 text-gray-600'
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function GapCard({ card }: GapCardProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (kind: string, text: string) => {
    const ok = await copyText(text)
    setCopied(ok ? kind : 'Gagal menyalin')
    window.setTimeout(() => setCopied(null), 1800)
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${severityClasses(card.severity)}`}>
            {SEVERITY_LABELS[card.severity]}
          </span>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
            {SOURCE_LABELS[card.source]}
          </span>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
            {card.category}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleCopy('Temuan disalin', formatGapCardText(card))}
          className="text-left text-xs font-medium text-teal-700 hover:text-teal-800 sm:text-right"
        >
          Salin temuan
        </button>
      </div>

      <dl className="mt-4 grid gap-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{GAP_CARD_LABELS.yangBelumJelas}</dt>
          <dd className="mt-1 text-sm leading-6 text-gray-800">{card.yangBelumJelas}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{GAP_CARD_LABELS.kenapaPenting}</dt>
          <dd className="mt-1 text-sm leading-6 text-gray-800">{card.kenapaPenting}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{GAP_CARD_LABELS.pertanyaanUntukTim}</dt>
            <button
              type="button"
              onClick={() => handleCopy('Pertanyaan disalin', card.pertanyaanUntukTim)}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Salin
            </button>
          </div>
          <dd className="mt-1 text-sm leading-6 text-gray-800">{card.pertanyaanUntukTim}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{GAP_CARD_LABELS.usulanRequirement}</dt>
            <button
              type="button"
              onClick={() => handleCopy('Usulan disalin', card.usulanRequirement)}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Salin
            </button>
          </div>
          <dd className="mt-1 text-sm leading-6 text-gray-800">{card.usulanRequirement}</dd>
        </div>
      </dl>

      {card.brdReference && (
        <blockquote className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
          Referensi BRD: {card.brdReference}
        </blockquote>
      )}
      {copied && <p className="mt-3 text-xs font-medium text-teal-700">{copied}</p>}
    </article>
  )
}
