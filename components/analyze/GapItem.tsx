'use client'

import { useEffect, useState, useCallback } from 'react'
import type { GapItem as GapItemType } from '@/types'
import { Button } from '@/components/ui/Button'

interface GapItemProps {
  gap: GapItemType
  index: number
  analysisId?: string
  canSubmitFeedback?: boolean
}

const confidenceBadge = {
  high: {
    label: 'Bukti kuat',
    className: 'bg-red-50 text-red-700 border border-red-200',
    borderClass: 'border-l-red-500',
  },
  medium: {
    label: 'Perlu dicek',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    borderClass: 'border-l-yellow-500',
  },
  low: {
    label: 'Dugaan',
    className: 'bg-gray-50 text-gray-600 border border-gray-200',
    borderClass: 'border-l-gray-400',
  },
} as const

const feedbackOptions = [
  { value: 'inaccurate', label: 'Gap ini sudah ada di BRD' },
  { value: 'duplicate', label: 'Gap ini duplikat' },
  { value: 'irrelevant', label: 'Gap ini tidak relevan' },
] as const

function FlagIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5v14M5 5h11l-1.5 4L16 13H5"
      />
    </svg>
  )
}

export function GapItem({
  gap,
  index,
  analysisId,
  canSubmitFeedback = false,
}: GapItemProps) {
  const confidence = gap.confidence ?? 'medium'
  const badge = confidenceBadge[confidence]
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] =
    useState<(typeof feedbackOptions)[number]['value']>('inaccurate')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!sent) return
    const timeout = window.setTimeout(() => setSent(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [sent])

  async function submitFeedback() {
    if (!analysisId || !canSubmitFeedback) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          gap_index: index,
          gap_text: gap.description,
          category: gap.category,
          confidence: gap.confidence ?? null,
          feedback_type: feedbackType,
          note,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Gagal mengirim feedback')
      }

      setIsModalOpen(false)
      setNote('')
      setFeedbackType('inaccurate')
      setSent(true)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Gagal mengirim feedback'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

const disabledReason = analysisId
    ? 'Login untuk kirim feedback'
    : 'Simpan analisis untuk kirim feedback'

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isModalOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isModalOpen, closeModal])

  // Focus trap: keep focus inside modal when open
  useEffect(() => {
    if (!isModalOpen) return
    const dialog = document.getElementById(`gap-dialog-${index}`)
    if (!dialog) return
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    focusable[0].focus()
  }, [isModalOpen, index])

  return (
    <li
      className={[
        'group relative rounded-lg border border-gray-100 border-l-2 bg-gray-50 px-4 py-3',
        badge.borderClass,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                badge.className,
              ].join(' ')}
            >
              {badge.label}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {gap.category}
            </span>
          </div>
          <p className="text-sm text-gray-700">{gap.description}</p>
          {gap.reference && (
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Dasar: {gap.reference}
            </p>
          )}
{sent && (
            <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-green-700">
              Feedback terkirim ✓
            </p>
          )}
        </div>

        <button
          type="button"
          aria-label="Flag gap tidak akurat"
          title={canSubmitFeedback ? 'Flag gap tidak akurat' : disabledReason}
          disabled={!canSubmitFeedback || !analysisId}
          onClick={() => setIsModalOpen(true)}
          className={[
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-gray-500 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            canSubmitFeedback && analysisId
              ? 'cursor-pointer border-gray-200 bg-white opacity-100 hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
              : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-300',
          ].join(' ')}
        >
          <FlagIcon />
        </button>
      </div>

      {isModalOpen && (
<div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 px-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`gap-feedback-title-${index}`}
        >
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h4
              id={`gap-feedback-title-${index}`}
              className="text-base font-semibold text-gray-900"
            >
              Gap ini tidak akurat?
            </h4>

            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">Alasan feedback</legend>
              {feedbackOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name={`feedback-${index}`}
                    value={option.value}
                    checked={feedbackType === option.value}
                    onChange={() => setFeedbackType(option.value)}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Catatan opsional
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Kenapa gap ini tidak akurat?"
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            {submitError && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {submitError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={submitFeedback}
                loading={isSubmitting}
              >
                Kirim Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
