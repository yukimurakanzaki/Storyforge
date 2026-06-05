// components/analyze/workspace/PrdArtifact.tsx
'use client'
import type { PrdDraft } from '@/types/workspace'

export function PrdArtifact({ prd, onUpdate }: { prd: PrdDraft | null; onUpdate: () => void }) {
  if (!prd) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-gray-500">PRD belum dibuat. Tutup gap-nya dulu, atau minta StoryForge menulis PRD sekarang.</p>
        <button onClick={onUpdate} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Tulis PRD
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">v{prd.version}</span>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(prd.markdown)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Salin</button>
          <button onClick={onUpdate}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">Perbarui PRD</button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900">{prd.markdown}</pre>
      {prd.openQuestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Open Questions</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">{prd.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}
      {prd.assumptions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asumsi & Di luar scope</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">{prd.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
