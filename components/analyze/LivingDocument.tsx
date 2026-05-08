'use client'
import { SectionCard } from './SectionCard'
import { FoundationSection } from './FoundationSection'
import { FoundationData } from './FoundationSection'
import { SectionStates, SessionState } from '@/types'

type Props = {
  foundationData: FoundationData | null
  sectionStates: SectionStates
  sessionState: SessionState
  onCopySection: (section: string, content: string) => void
}

const SECTION_META = [
  { key: 'roles', icon: '👤', title: 'Roles & Access', badges: ['PM', 'Dev', 'Designer'] },
  { key: 'flow', icon: '🗺️', title: 'Flow & Logic', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'engineer', icon: '⚙️', title: 'Engineer Section', badges: ['Dev'] },
  { key: 'designer', icon: '🎨', title: 'Designer Section', badges: ['Designer'] },
  { key: 'qa', icon: '🧪', title: 'QA Section', badges: ['QA'] },
  { key: 'templates', icon: '📎', title: 'Template Artifacts', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'stakeholder', icon: '📊', title: 'Stakeholder View', badges: ['Business'] },
] as const

export function LivingDocument({ foundationData, sectionStates, sessionState, onCopySection }: Props) {
  const isReady = sessionState === 'ready' || sessionState === 'done'

  return (
    <div className="space-y-3">
      {/* Section 1: Foundation — always visible, always first */}
      <SectionCard
        title="Foundation"
        icon="📌"
        badges={['PM', 'Semua']}
        status={sectionStates.foundation}
        onCopy={foundationData ? () => onCopySection('foundation', JSON.stringify(foundationData, null, 2)) : undefined}
      >
        {foundationData && <FoundationSection data={foundationData} />}
      </SectionCard>

      {/* Sections 2–8: disabled until session is ready; no onGenerate prop yet */}
      {SECTION_META.map(({ key, icon, title, badges }) => (
        <SectionCard
          key={key}
          title={title}
          icon={icon}
          badges={[...badges]}
          status={sectionStates[key as keyof SectionStates]}
          disabled={!isReady}
        />
      ))}

      {/* Section 9: Export — always last */}
      <SectionCard
        title="Output & Export"
        icon="🚀"
        badges={['Semua']}
        status="empty"
      >
        <p className="text-slate-500 text-sm">Export tersedia setelah semua section selesai. (Plan 5)</p>
      </SectionCard>
    </div>
  )
}
