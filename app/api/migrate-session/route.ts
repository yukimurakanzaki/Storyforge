import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TempSession } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: TempSession
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id || !body.createdAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('analyze_sessions')
    .insert({
      user_id: user.id,
      status: 'active',
      requirement_context: body.brdText || null,
      messages: body.messages ?? [],
      current_analysis: body.result ?? null,
      artifact: body.requirements ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[migrate-session] insert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessionId: data.id })
}
