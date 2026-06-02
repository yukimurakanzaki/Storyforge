import type { AnalysisResult } from '@/types'
import type { EnhancedAnalysisResult } from '@/types/analysis-v2'
import { isEnhancedResult } from '@/types/analysis-v2'

export type RefinementMergedResult = AnalysisResult & {
  needsReanalysis?: boolean
}

type StoredAnalysisForRefinement = AnalysisResult & Partial<EnhancedAnalysisResult>

export function mergeRefinementAnalysis(
  currentResult: StoredAnalysisForRefinement,
  refinedAnalysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'>
): RefinementMergedResult {
  const merged: RefinementMergedResult = {
    id: currentResult.id,
    sessionId: currentResult.sessionId,
    createdAt: currentResult.createdAt,
    gapList: refinedAnalysis.gapList,
    clarificationQuestions: refinedAnalysis.clarificationQuestions,
    readinessScore: refinedAnalysis.readinessScore,
    readinessLabel: refinedAnalysis.readinessLabel,
  }

  if (isEnhancedResult(currentResult)) {
    merged.needsReanalysis = true
  }

  return merged
}
