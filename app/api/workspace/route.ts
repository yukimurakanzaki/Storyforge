// app/api/workspace/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isUsageEnforcementEnabled } from '@/lib/flags'
import { sseEvent, createSSEStream } from '@/lib/sse'
import { getModelConfig } from '@/lib/model-selector'
import { checkUsage, incrementUsage, logAnalysisEvent } from '@/lib/usage'
import { withTimeout } from '@/lib/with-timeout'
import { AI_TIMEOUT_MS } from '@/lib/analysis/constants'
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

function extractFirstJsonObject(text: string): string {
  const stripped = stripFence(text)
  if (stripped.startsWith('{')) return stripped

  const start = stripped.indexOf('{')
  if (start === -1) return stripped

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < stripped.length; i += 1) {
    const char = stripped[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return stripped.slice(start, i + 1)
    }
  }

  return stripped
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

async function persistWorkspaceState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  state: WorkspaceState,
  userId: string,
  projectId: string | null,
  existingRowId: unknown,
) {
  const row = stateToRow(state, userId, projectId)
  if (typeof existingRowId === 'string' && existingRowId) {
    return supabase
      .from('analysis_results')
      .update(row)
      .eq('id', existingRowId)
      .eq('user_id', userId)
  }

  return supabase.from('analysis_results').insert(row)
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
  const isNewSession = !row
  const derivedTitle = message.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) || 'Sesi baru'
  let state: WorkspaceState = row ? rowToState(row) : newState(sessionId, derivedTitle, message)

  // Append the user's message.
  const userMsg: ChatMessage = { role: 'user', content: message }
  state = { ...state, messages: [...state.messages, userMsg] }

  // Quota/measurement writes go through the SERVICE-ROLE client: steady-state RLS
  // gives end users SELECT-own only on usage_counters/analysis_events, so the
  // user-cookie client cannot (and must not) write them.
  const svc = createServiceClient()

  // Tier check. Billing unit: one analysis = one NEW living session. Continuing
  // an existing session is always allowed and never consumes quota (the
  // living-workspace promise). checkUsage also yields the plan for model config.
  const usage = await checkUsage(svc, user.id)
  const plan = usage.plan
  // Enforcement (the 429 block) is gated by the kill-switch; measurement below
  // runs regardless so counters/metrics stay accurate even in measure-only mode.
  if (isNewSession && isUsageEnforcementEnabled() && !usage.allowed) {
    return NextResponse.json(
      { error: 'Limit reached', count: usage.count, limit: usage.limit, plan },
      { status: 429, headers: { 'X-Limit-Reached': 'true' } },
    )
  }
  const modelConfig = getModelConfig(plan)
  const wordCount = message.trim().split(/\s+/).filter(Boolean).length
  const contextBlock = await loadContextLayers(supabase, user.id, projectId)

  const { readable, enqueue, close, error: streamError } = createSSEStream()
  const headers = new Headers({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })

  ;(async () => {
    const startTime = Date.now()
    try {
      enqueue(sseEvent('status', { message: 'Menganalisis...' }))

      // Measurement: a turn has started (source of WAA / completion-rate metrics).
      try {
        await logAnalysisEvent(svc, user.id, sessionId, 'analysis_started', wordCount)
      } catch (e) {
        console.error('[api/workspace] log analysis_started failed:', e)
      }

      // 1. Compact if the verbatim tail is too long (cheap summary call).
      if (needsCompaction(state)) {
        const slice = compactionSlice(state)
        const sum = await withTimeout(anthropic.messages.create({
          model: modelConfig.model, max_tokens: 512, temperature: 0,
          messages: [{ role: 'user', content: buildSummaryPrompt(slice) }],
        }), AI_TIMEOUT_MS)
        const summaryText = sum.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim()
        state = applyCompaction(state, summaryText)
      }

      // 2. Main turn.
      const payload = buildModelPayload(state, contextBlock)
      const completion = await withTimeout(anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: plan === 'pro' ? 8192 : 6144,
        temperature: 0,
        system: payload.system,
        messages: payload.messages,
      }), AI_TIMEOUT_MS)
      const raw = completion.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
      if (process.env.NODE_ENV !== 'production') {
        console.log('[api/workspace] raw model response:', raw)
      }

      let parsed: ModelTurnResponse
      try { parsed = JSON.parse(extractFirstJsonObject(raw)) } catch {
        console.error('[api/workspace] JSON parse failed:', raw.slice(0, 300))
        streamError('Terjadi kesalahan. Coba lagi.'); return
      }

      // Sanitize untrusted LLM output before applying to state.
      parsed = sanitizeTurn(parsed)

      // 3. Apply + append assistant message + persist. (applyTurn already rescores authoritatively.)
      const now = new Date().toISOString()
      state = applyTurn(state, parsed, now)
      state = { ...state, messages: [...state.messages, { role: 'assistant', content: parsed.assistantMessage }] }

      const { error: persistErr } = await persistWorkspaceState(supabase, state, user.id, projectId, row?.id)
      if (persistErr) { console.error('[api/workspace] persist failed:', persistErr); streamError('Gagal menyimpan. Coba lagi.'); return }

      // Bookkeeping after a successful turn: consume quota only for a NEW session,
      // and record completion for metrics. Wrapped so a DB hiccup can't kill `done`.
      try {
        if (isNewSession) await incrementUsage(svc, user.id)
        await logAnalysisEvent(svc, user.id, sessionId, 'analysis_completed', wordCount, Date.now() - startTime)
      } catch (e) {
        console.error('[api/workspace] post-success bookkeeping failed:', e)
      }

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
