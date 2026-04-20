import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createServiceClient()

  // Phase 2: update existing row with requirements
  if (body.sessionId && body.requirements) {
    const { error } = await supabase
      .from('analysis_history')
      .update({
        requirements: body.requirements,
        status: 'done',
      })
      .eq('session_id', body.sessionId)

    if (error) {
      console.error('[save-session] phase-2 update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // Phase 1: insert new row
  const { sessionId, brdText, initialAnalysis, messages } = body

  if (!sessionId || !brdText || !initialAnalysis) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('analysis_history')
    .upsert(
      {
        session_id: sessionId,
        brd_text: brdText,
        initial_analysis: initialAnalysis,
        refinement_messages: messages ?? [],
        status: 'finalizing',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )

  if (error) {
    console.error('[save-session] phase-1 upsert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
