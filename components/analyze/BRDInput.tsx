'use client'

import { Button } from '@/components/ui/Button'
import { MAX_WORDS_FREE } from '@/lib/constants'

interface BRDInputProps {
  value: string
  onChange: (value: string) => void
  onAnalyze: (text: string) => void
  onSample: () => void
  isLoading?: boolean
  isPro?: boolean
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function BRDInput({
  value,
  onChange,
  onAnalyze,
  onSample,
  isLoading = false,
  isPro = false,
}: BRDInputProps) {
  const wordCount = countWords(value)
  const overLimit = !isPro && wordCount > MAX_WORDS_FREE

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="brd-input"
          className="text-sm font-medium text-gray-700"
        >
          BRD / Dokumen Produk
        </label>
        <span
          className={[
            'text-xs tabular-nums',
            overLimit ? 'text-red-600 font-semibold' : 'text-gray-400',
          ].join(' ')}
        >
          {wordCount.toLocaleString('id-ID')} kata
        </span>
      </div>

      <textarea
        id="brd-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        placeholder="Paste BRD kamu di sini..."
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {overLimit && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>Batas kata terlampaui.</strong> Akun Free hanya mendukung hingga{' '}
          {MAX_WORDS_FREE.toLocaleString('id-ID')} kata. Upgrade ke Pro untuk analisis BRD
          yang lebih panjang.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="primary"
          disabled={wordCount === 0 || overLimit}
          loading={isLoading}
          onClick={() => onAnalyze(value)}
          className="flex-1"
        >
          Analyze BRD
        </Button>
        <Button
          variant="secondary"
          onClick={onSample}
          disabled={isLoading}
          className="flex-1 sm:flex-none"
        >
          Coba dengan contoh BRD →
        </Button>
      </div>
    </div>
  )
}
