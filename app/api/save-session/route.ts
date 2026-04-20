import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      wordCount,
      tokenCount,
      durationMs,
      readinessScore,
      eventType = 'analysis_completed',
    } = body

    // Supabase is optional — if not configured, still return 200
    // so the UI doesn't show an error banner
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceRoleKey)

      const { error } = await supabase.from('analysis_events').insert({
        session_id: sessionId ?? crypto.randomUUID(),
        event_type: eventType,
        word_count: wordCount ?? null,
        token_count: tokenCount ?? null,
        duration_ms: durationMs ?? null,
        // user_id left null until auth is wired up
      })

      if (error) {
        console.error('[save-session] Supabase insert error:', error.message)
        // Still return 200 — don't surface DB errors to the user
      }
    }

    return NextResponse.json({
      ok: true,
      sessionId: sessionId ?? crypto.randomUUID(),
      readinessScore: readinessScore ?? null,
    })
  } catch (err) {
    console.error('[save-session] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
