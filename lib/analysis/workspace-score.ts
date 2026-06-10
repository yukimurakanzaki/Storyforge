// lib/analysis/workspace-score.ts
import type { WorkspaceGap } from '@/types/workspace'

const SEVERITY_PENALTY = { high: 15, medium: 8, low: 3 } as const

/** Score = 100 minus penalties for OPEN gaps only. Resolved gaps carry no penalty. */
export function computeWorkspaceScore(gaps: WorkspaceGap[]): number {
  const penalty = gaps
    .filter((g) => g.status === 'open')
    .reduce((sum, g) => sum + SEVERITY_PENALTY[g.severity], 0)
  return Math.max(0, Math.min(100, 100 - penalty))
}
