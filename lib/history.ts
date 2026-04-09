import { SupabaseClient } from '@supabase/supabase-js'
import { AnalysisResult, GapItem } from '@/types'

export interface SavedAnalysis {
  id: string
  user_id: string
  brd_text: string
  gap_list: GapItem[]
  clarification_questions: string[]
  readiness_score: number
  readiness_label: string
  session_id: string | null
  parent_analysis_id: string | null
  created_at: string
}

export async function saveAnalysisResult(
  supabase: SupabaseClient,
  userId: string,
  brdText: string,
  result: AnalysisResult
): Promise<string | null> {
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      user_id: userId,
      brd_text: brdText,
      gap_list: result.gapList,
      clarification_questions: result.clarificationQuestions,
      readiness_score: result.readinessScore,
      readiness_label: result.readinessLabel,
      session_id: result.sessionId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save analysis result:', error)
    return null
  }

  return data.id
}

export async function getAnalysisHistory(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<SavedAnalysis[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch history:', error)
    return []
  }

  return data as SavedAnalysis[]
}

export async function getAnalysisById(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<SavedAnalysis | null> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Failed to fetch analysis:', error)
    return null
  }

  return data as SavedAnalysis
}
