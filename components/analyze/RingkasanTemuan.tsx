'use client'

import type { RingkasanTemuan, SummaryItem } from '@/types/analysis-v2'
import { SECTION_LABELS, SEVERITY_LABELS, SUMMARY_LABELS, SOURCE_LABELS } from '@/lib/analysis/constants'

interface RingkasanTemuanProps {
  ringkasanTemuan: RingkasanTemuan
}

function severityLabel(severity: SummaryItem['severity']) {
  return SEVERITY_LABELS[severity]
}

function SummaryList({ title, items }: { title: string; items: SummaryItem[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">Tidak ada item utama.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-5 text-gray-700">
              <span className="mt-0.5 text-xs tabular-nums text-gray-400">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <p>{item.text}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                    {severityLabel(item.severity)}
                  </span>
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                    {SOURCE_LABELS[item.source]}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function RingkasanTemuanView({ ringkasanTemuan }: RingkasanTemuanProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Ringkasan Temuan</h2>
          <p className="text-sm text-gray-500">
            {SECTION_LABELS.newFindingsHeader(ringkasanTemuan.totalNewFindings)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <SummaryList title={SUMMARY_LABELS.criticalGaps} items={ringkasanTemuan.criticalGaps} />
        <SummaryList title={SUMMARY_LABELS.questionsToAsk} items={ringkasanTemuan.questionsToAsk} />
        <SummaryList title={SUMMARY_LABELS.requirementsToAdd} items={ringkasanTemuan.requirementsToAdd} />
      </div>
    </section>
  )
}
