// components/analyze/workspace/ArtifactPanel.tsx
'use client'
import type { UseWorkspace } from '@/hooks/useWorkspace'
import { GapsScorePanel } from './GapsScorePanel'
import { PrdArtifact } from './PrdArtifact'

export function ArtifactPanel({ ws }: { ws: UseWorkspace }) {
  if (!ws.state) return null
  const tabBase = 'px-4 py-2 text-sm font-medium border-b-2 -mb-px'
  const active = 'text-teal-700 border-teal-600'
  const inactive = 'text-gray-500 border-transparent hover:text-gray-700'
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white px-2">
        <button className={`${tabBase} ${ws.activeTab === 'gaps' ? active : inactive}`} onClick={() => ws.setActiveTab('gaps')}>Gaps & Score</button>
        <button className={`${tabBase} ${ws.activeTab === 'prd' ? active : inactive}`} onClick={() => ws.setActiveTab('prd')}>PRD</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {ws.activeTab === 'gaps'
          ? <GapsScorePanel gaps={ws.state.gaps} score={ws.state.readinessScore} label={ws.state.readinessLabel} onAnswer={ws.answerGap} onDismiss={ws.dismissGap} />
          : <PrdArtifact prd={ws.state.prd} onUpdate={ws.generatePrd} />}
      </div>
    </div>
  )
}
