// app/api/workspace/gap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'
import { computeWorkspaceScore } from '@/lib/analysis/workspace-score'
import { getScoreLabel } from '@/lib/analysis/score-utils'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let b: { sessionId?: string; gapId?: string; answer?: string; outOfScope?: boolean }
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!b.sessionId || !b.gapId) return NextResponse.json({ error: 'Missing sessionId/gapId' }, { status: 400 })

  const { data: row } = await supabase.from('analysis_results').select('*')
    .eq('session_id', b.sessionId).eq('user_id', user.id).single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date().toISOString()
  const state = rowToState(row)
  const gaps = state.gaps.map((g) => g.id !== b.gapId || g.status !== 'open' ? g
    : b.outOfScope ? { ...g, status: 'out_of_scope' as const, resolvedAt: now }
    : { ...g, status: 'answered' as const, answer: (b.answer ?? '').trim(), resolvedAt: now })
  const score = computeWorkspaceScore(gaps)
  const next = { ...state, gaps, readinessScore: score, readinessLabel: getScoreLabel(score), lastActiveAt: now }

  const { error } = await supabase
    .from('analysis_results')
    .update(stateToRow(next, user.id, row.project_id as string | null))
    .eq('id', row.id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ state: next })
}
