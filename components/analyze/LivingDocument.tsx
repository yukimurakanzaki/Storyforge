'use client'

import { SectionCard } from './SectionCard'
import { SectionStates, SessionState, LivingDocumentProps } from '@/types'
import { FoundationSection } from './FoundationSection'
import { OutputPanelV2 } from './OutputPanelV2'
import { SECTION_LABELS } from '@/lib/analysis/constants'
import { formatAnalysisReviewText } from '@/lib/analysis/copy-formatter'

// SVG icons with aria-hidden (decorative, not semantic)
const ICONS: Record<string, { svg: string; label: string }> = {
  foundation: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    label: 'Foundation',
  },
  roles: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    label: 'Roles & Access',
  },
  flow: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    label: 'Flow & Logic',
  },
  engineer: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
    label: 'Engineer Section',
  },
  designer: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>`,
    label: 'Designer Section',
  },
  qa: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/></svg>`,
    label: 'QA Section',
  },
  templates: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    label: 'Template Artifacts',
  },
  stakeholder: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    label: 'Stakeholder View',
  },
  export: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    label: 'Output & Export',
  },
}

type SectionKey = 'foundation' | 'roles' | 'flow' | 'engineer' | 'designer' | 'qa' | 'templates' | 'stakeholder'

const SECTION_META: { key: SectionKey; title: string; badges: string[] }[] = [
  { key: 'roles', title: 'Roles & Access', badges: ['PM', 'Dev', 'Designer'] },
  { key: 'flow', title: 'Flow & Logic', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'engineer', title: 'Engineer Section', badges: ['Dev'] },
  { key: 'designer', title: 'Designer Section', badges: ['Designer'] },
  { key: 'qa', title: 'QA Section', badges: ['QA'] },
  { key: 'templates', title: 'Template Artifacts', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'stakeholder', title: 'Stakeholder View', badges: ['Business'] },
]

export function LivingDocument({
  foundationData,
  enhancedResult,
  sectionStates,
  sessionState,
  onCopySection,
}: LivingDocumentProps) {
  const isReady = sessionState === 'ready' || sessionState === 'done'

  return (
    <div className="space-y-3">
      {/* Section 1: Foundation */}
      <SectionCard
        title={enhancedResult ? SECTION_LABELS.outputPanel : 'Foundation'}
        icon={ICONS.foundation.svg}
        iconLabel={enhancedResult ? SECTION_LABELS.outputPanel : ICONS.foundation.label}
        badges={['PM', 'Semua']}
        status={sectionStates.foundation}
        onCopy={
          enhancedResult
            ? () => onCopySection('analysis-v2', formatAnalysisReviewText(enhancedResult))
            : foundationData
              ? () => onCopySection('foundation', JSON.stringify(foundationData, null, 2))
              : undefined
        }
      >
        {enhancedResult ? (
          <OutputPanelV2 result={enhancedResult} />
        ) : (
          foundationData && <FoundationSection data={foundationData} />
        )}
      </SectionCard>

      {/* Sections 2–8: collapsed into one locked block until ready */}
      {!isReady ? (
        <div className="border border-gray-200 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Sections berikutnya</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              Score ≥ 80 untuk membuka
            </span>
          </div>
          <ul className="space-y-2">
            {SECTION_META.map(({ title, badges }) => (
              <li key={title} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{title}</span>
                <div className="flex gap-1">
                  {badges.map(b => (
                    <span key={b} className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                      {b}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        SECTION_META.map(({ key, title, badges }) => {
          const iconData = ICONS[key]
          return (
            <SectionCard
              key={key}
              title={title}
              icon={iconData.svg}
              iconLabel={iconData.label}
              badges={[...badges]}
              status={sectionStates[key as keyof SectionStates]}
              disabled={false}
            />
          )
        })
      )}

      {/* Export — visible only when all sections are done */}
      {isReady && (
        <SectionCard
          title="Output & Export"
          icon={ICONS.export.svg}
          iconLabel={ICONS.export.label}
          badges={['Semua']}
          status="empty"
        >
          <p className="text-gray-500 text-sm">Export tersedia setelah semua section selesai.</p>
        </SectionCard>
      )}
    </div>
  )
}
