// app/api/user-context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('user_context').select('*').eq('user_id', user.id).single()
  return NextResponse.json({ context: data ?? null })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let b: Record<string, unknown>
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const row = {
    user_id: user.id,
    industry: String(b.industry ?? '').slice(0, 200),
    role: String(b.role ?? '').slice(0, 200),
    compliance: Array.isArray(b.compliance) ? (b.compliance as unknown[]).map(String).slice(0, 20) : [],
    tech_defaults: (b.techDefaults && typeof b.techDefaults === 'object') ? b.techDefaults : {},
    standing_instructions: String(b.standingInstructions ?? '').slice(0, 4000),
    prd_template: String(b.prdTemplate ?? '').slice(0, 8000),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('user_context').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
