// app/api/workspace/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { sseEvent, createSSEStream } from '@/lib/sse'
import { getModelConfig } from '@/lib/model-selector'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'
import { applyTurn } from '@/lib/analysis/workspace-reducer'
import {
  buildModelPayload, needsCompaction, compactionSlice, applyCompaction,
} from '@/lib/analysis/workspace-context'
import { buildSummaryPrompt } from '@/lib/prompts/workspace'
import { loadContextLayers } from '@/lib/analysis/context-loader' // Story 2; returns '' until then
import { getScoreLabel } from '@/lib/analysis/score-utils'
import type { WorkspaceState, ModelTurnResponse } from '@/types/workspace'
import type { ChatMessage } from '@/types'

export const runtime = 'nodejs'
const MAX_MESSAGE_CHARS = 150_000

function stripFence(t: string): string {
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

/**
 * Sanitize untrusted LLM output before applying it to state.
 * 1. Clamp gap severity to valid enum values (prevents NaN in score).
 * 2. De-conflict gap IDs: remove any id from outOfScopeGapIds that also
 *    appears in resolvedGapIds (an answer wins over out-of-scope).
 */
function sanitizeTurn(parsed: ModelTurnResponse): ModelTurnResponse {
  const VALID_SEVERITIES = new Set<string>(['high', 'medium', 'low'])
  const resolvedSet = new Set(parsed.resolvedGapIds)

  return {
    ...parsed,
    newGaps: parsed.newGaps.map((gap) => ({
      ...gap,
      severity: VALID_SEVERITIES.has(gap.severity) ? gap.severity : 'medium',
    })),
    outOfScopeGapIds: parsed.outOfScopeGapIds.filter((id) => !resolvedSet.has(id)),
  }
}

function newState(sessionId: string, title: string, brdText: string): WorkspaceState {
  return {
    sessionId, title, brdText, gaps: [], readinessScore: 100, readinessLabel: getScoreLabel(100),
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown; message?: unknown; projectId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null
  const message = typeof body.message === 'string' ? body.message.slice(0, MAX_MESSAGE_CHARS) : null
  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : null
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  // Load or create the living session.
  const { data: row } = await supabase
    .from('analysis_results').select('*').eq('session_id', sessionId).eq('user_id', user.id).single()
  const derivedTitle = message.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) || 'Sesi baru'
  let state: WorkspaceState = row ? rowToState(row) : newState(sessionId, derivedTitle, message)

  // Append the user's message.
  const userMsg: ChatMessage = { role: 'user', content: message }
  state = { ...state, messages: [...state.messages, userMsg] }

  const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
  const plan = (sub?.plan as 'free' | 'pro') || 'free'
  const modelConfig = getModelConfig(plan)
  const contextBlock = await loadContextLayers(supabase, user.id, projectId)

  const { readable, enqueue, close, error: streamError } = createSSEStream()
  const headers = new Headers({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })

  ;(async () => {
    try {
      enqueue(sseEvent('status', { message: 'Menganalisis...' }))

      // 1. Compact if the verbatim tail is too long (cheap summary call).
      if (needsCompaction(state)) {
        const slice = compactionSlice(state)
        const sum = await anthropic.messages.create({
          model: modelConfig.model, max_tokens: 512, temperature: 0,
          messages: [{ role: 'user', content: buildSummaryPrompt(slice) }],
        })
        const summaryText = sum.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim()
        state = applyCompaction(state, summaryText)
      }

      // 2. Main turn.
      const payload = buildModelPayload(state, contextBlock)
      const completion = await anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: plan === 'pro' ? 8192 : 6144,
        temperature: 0,
        system: payload.system,
        messages: payload.messages,
      })
      const raw = completion.content.map((c) => (c.type === 'text' ? c.text : '')).join('')

      let parsed: ModelTurnResponse
      try { parsed = JSON.parse(stripFence(raw)) } catch {
        console.error('[api/workspace] JSON parse failed:', raw.slice(0, 300))
        streamError('Terjadi kesalahan. Coba lagi.'); return
      }

      // Sanitize untrusted LLM output before applying to state.
      parsed = sanitizeTurn(parsed)

      // 3. Apply + append assistant message + persist. (applyTurn already rescores authoritatively.)
      const now = new Date().toISOString()
      state = applyTurn(state, parsed, now)
      state = { ...state, messages: [...state.messages, { role: 'assistant', content: parsed.assistantMessage }] }

      const { error: upErr } = await supabase
        .from('analysis_results').upsert(stateToRow(state, user.id, projectId), { onConflict: 'session_id' })
      if (upErr) { console.error('[api/workspace] upsert failed:', upErr); streamError('Gagal menyimpan. Coba lagi.'); return }

      enqueue(sseEvent('done', {
        assistantMessage: parsed.assistantMessage,
        intent: parsed.intent,
        resolvedGapIds: parsed.resolvedGapIds,
        state,
      }))
      close()
    } catch (err) {
      console.error('[api/workspace] error:', err)
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers })
}

// app/api/workspace/route.ts — add below the existing POST
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const { data: row } = await supabase.from('analysis_results').select('*')
    .eq('session_id', sessionId).eq('user_id', user.id).single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ state: rowToState(row) })
}
