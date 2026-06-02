'use client'

interface AnalysisProgressProps {
  statusMessage?: string
}

export function AnalysisProgress({ statusMessage }: AnalysisProgressProps) {
  const message = statusMessage || 'Sedang membaca BRD...'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Menganalisis BRD"
      className="flex flex-1 flex-col items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
          <p className="text-sm font-semibold text-gray-800">{message}</p>
        </div>

        <div className="space-y-4">
          <div className="h-16 rounded-lg bg-gray-100" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-5/6 rounded bg-gray-100" />
            <div className="h-3 w-3/5 rounded bg-gray-100" />
          </div>
        </div>

        <p className="mt-5 text-xs text-gray-400">Biasanya selesai dalam 15-30 detik</p>
      </div>
    </div>
  )
}
