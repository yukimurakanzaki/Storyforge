'use client'

import { useState } from 'react'
import type { GapCard } from '@/types/analysis-v2'
import { formatAllQuestions, formatAllRequirements } from '@/lib/analysis/copy-formatter'
import { COPY_LABELS } from '@/lib/analysis/constants'
import { Button } from '@/components/ui/Button'

interface CopyActionsProps {
  gapCards: GapCard[]
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function CopyActions({ gapCards }: CopyActionsProps) {
  const [toast, setToast] = useState<string | null>(null)
  const [fallbackText, setFallbackText] = useState<string | null>(null)

  const copy = async (text: string, successMessage: string) => {
    const ok = await writeClipboard(text)
    if (ok) {
      setToast(successMessage)
      window.setTimeout(() => setToast(null), 2200)
    } else {
      setFallbackText(text)
    }
  }

  const questions = formatAllQuestions(gapCards)
  const requirements = formatAllRequirements(gapCards)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          disabled={!questions}
          onClick={() => copy(questions, COPY_LABELS.toastQuestionsCopied)}
          className="flex-1"
        >
          {COPY_LABELS.copyAllQuestions}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!requirements}
          onClick={() => copy(requirements, COPY_LABELS.toastRequirementsCopied)}
          className="flex-1"
        >
          {COPY_LABELS.copyAllRequirements}
        </Button>
      </div>
      {toast && <p className="mt-3 text-sm font-medium text-teal-700">{toast}</p>}

      {fallbackText && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-900">Salin manual</p>
            <button
              type="button"
              onClick={() => setFallbackText(null)}
              className="text-xs font-medium text-amber-800 hover:text-amber-900"
            >
              Tutup
            </button>
          </div>
          <textarea
            readOnly
            value={fallbackText}
            className="mt-2 h-36 w-full rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </section>
  )
}
