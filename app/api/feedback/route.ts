import { NextRequest, NextResponse } from 'next/server'
import { validateFeedbackPayload } from '@/lib/feedback'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateFeedbackPayload(body)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: analysis, error: analysisError } = await supabase
    .from('analysis_results')
    .select('id')
    .eq('id', validation.feedback.analysis_id)
    .eq('user_id', user.id)
    .single()

  if (analysisError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  const { error } = await supabase.from('gap_feedback').upsert(
    {
      ...validation.feedback,
      user_id: user.id,
    },
    {
      onConflict: 'user_id,analysis_id,gap_index,feedback_type',
    }
  )

  if (error) {
    console.error('[api/feedback] insert failed:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
