'use client'

import Link from 'next/link'

interface UpgradeCTAProps {
  variant?: 'inline' | 'blocking'
  message?: string
}

const DEFAULT_MESSAGE =
  'Kamu sudah mencapai batas analisis bulan ini. Upgrade ke Pro untuk melanjutkan.'

export function UpgradeCTA({ variant = 'inline', message }: UpgradeCTAProps) {
  const displayMessage = message || DEFAULT_MESSAGE

  if (variant === 'blocking') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="upgrade-cta-title"
        aria-describedby="upgrade-cta-desc"
      >
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
            <svg
              className="h-6 w-6 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h2
            id="upgrade-cta-title"
            className="mb-2 text-lg font-semibold text-gray-900"
          >
            Batas Analisis Tercapai
          </h2>
          <p id="upgrade-cta-desc" className="mb-6 text-sm text-gray-600">
            {displayMessage}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Upgrade ke Pro
          </Link>
        </div>
      </div>
    )
  }

  // Inline variant: prominent banner/card
  return (
    <div
      className="rounded-xl border border-teal-200 bg-teal-50 p-4"
      role="alert"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
            <svg
              className="h-4 w-4 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-teal-800">{displayMessage}</p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Upgrade ke Pro
        </Link>
      </div>
    </div>
  )
}
