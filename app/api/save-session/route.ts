import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ChatMessage, GapItem, RequirementsResult } from '@/types'
import { isEnhancedResult } from '@/types/analysis-v2'

const MAX_BRD_CHARS = 150_000
const MAX_MESSAGES = 30
const MAX_STRING = 2000

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function clampString(v: unknown, max: number): string | null {
  if (!isString(v)) return null
  return v.slice(0, max)
}

function validateMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > MAX_MESSAGES) return null
  const out: ChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') return null
    if (!isString(content)) return null
    out.push({ role, content: content.slice(0, MAX_STRING) })
  }
  return out
}

function validateGapList(raw: unknown): GapItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((g) => g && typeof g === 'object')
    .slice(0, 20)
    .map((g) => ({
      category: clampString((g as Record<string, unknown>).category, 200) ?? '',
      description: clampString((g as Record<string, unknown>).description, MAX_STRING) ?? '',
      severity: (['high', 'medium', 'low'].includes((g as Record<string, unknown>).severity as string)
        ? (g as Record<string, unknown>).severity
        : 'low') as GapItem['severity'],
      confidence: (['high', 'medium', 'low'].includes((g as Record<string, unknown>).confidence as string)
        ? (g as Record<string, unknown>).confidence
        : undefined) as GapItem['confidence'],
      reference: clampString((g as Record<string, unknown>).reference, 500) ?? null,
    }))
}

function validateClarificationQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isString)
    .slice(0, 10)
    .map((q) => q.slice(0, MAX_STRING))
}

function asJsonObjectOrNull(raw: unknown): Record<string, unknown> | unknown[] | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown> | unknown[]
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // Phase 2: update existing row with requirements
  if (b.sessionId && b.requirements) {
    const sessionId = clampString(b.sessionId, 100)
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const req = b.requirements as RequirementsResult
    if (!req || typeof req !== 'object' || !Array.isArray(req.userStories)) {
      return NextResponse.json({ error: 'Invalid requirements' }, { status: 400 })
    }

    const { error } = await supabase
      .from('analysis_results')
      .update({
        requirements: req,
        status: 'done',
        session_state: (b as Record<string, unknown>).sessionState ?? 'done',
        sections: (b as Record<string, unknown>).sections ?? {},
        section_states: (b as Record<string, unknown>).sectionStates ?? {},
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[save-session] phase-2 update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // Phase 1: insert / upsert new row
  const sessionId = clampString(b.sessionId, 100)
  const brdText = clampString(b.brdText, MAX_BRD_CHARS)

  if (!sessionId || !brdText || !brdText.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const analysis = b.initialAnalysis
  if (!analysis || typeof analysis !== 'object') {
    return NextResponse.json({ error: 'Missing initialAnalysis' }, { status: 400 })
  }

  const a = analysis as Record<string, unknown>
  const readinessScore = typeof a.readinessScore === 'number'
    ? Math.min(100, Math.max(0, Math.round(a.readinessScore)))
    : 0
  const readinessLabel = clampString(a.readinessLabel, 100) ?? 'Perlu Klarifikasi'
  const gapList = validateGapList(a.gapList)
  const clarificationQuestions = validateClarificationQuestions(a.clarificationQuestions)
  const enhanced = isEnhancedResult(analysis)

  const messages = validateMessages(b.messages)
  if (messages === null) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const v2Columns = enhanced
    ? {
        score_components: asJsonObjectOrNull(a.scoreComponents),
        ringkasan_temuan: asJsonObjectOrNull(a.ringkasanTemuan),
        gap_cards: Array.isArray(a.gapCards) ? a.gapCards : [],
        journey_map: a.journeyMap === null ? null : asJsonObjectOrNull(a.journeyMap),
        schema_version: 2,
      }
    : {
        schema_version: 1,
      }

  const { data, error } = await supabase
    .from('analysis_results')
    .upsert(
      {
        user_id: user.id,
        session_id: sessionId,
        brd_text: brdText,
        gap_list: gapList,
        clarification_questions: clarificationQuestions,
        readiness_score: readinessScore,
        readiness_label: readinessLabel,
        messages,
        status: 'finalizing',
        created_at: new Date().toISOString(),
        project_id: b.projectId ?? null,
        session_state: b.sessionState ?? 'refining',
        sections: b.sections ?? {},
        section_states: b.sectionStates ?? {
          foundation: 'empty',
          roles: 'empty',
          flow: 'empty',
          engineer: 'empty',
          designer: 'empty',
          qa: 'empty',
          templates: 'empty',
          stakeholder: 'empty',
        },
        ...v2Columns,
      },
      { onConflict: 'session_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[save-session] phase-1 upsert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, analysisId: data.id })
}
