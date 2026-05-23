import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { checkGuestRateLimit, getClientIp } from '@/lib/guest-rate-limit'
import { checkUsage, incrementUsage, logAnalysisEvent } from '@/lib/usage'
import { sseEvent, createSSEStream } from '@/lib/sse'
import type { ProjectContext } from '@/types'

export const runtime = 'nodejs'

const MAX_ANALYZE_TEXT_CHARS = 150_000

type AnalyzeValidationResult =
  | { valid: true; text: string; projectId: string | null }
  | { valid: false; error: string; status: number }

export function validateAnalyzePayload(body: unknown): AnalyzeValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Missing request body', status: 400 }
  }

  const text = (body as { text?: unknown }).text
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, error: 'Missing text', status: 400 }
  }

  if (text.length > MAX_ANALYZE_TEXT_CHARS) {
    return { valid: false, error: 'BRD text too large', status: 413 }
  }

  const rawProjectId = (body as { projectId?: unknown }).projectId
  const projectId: string | null =
    rawProjectId === null || rawProjectId === undefined
      ? null
      : typeof rawProjectId === 'string' && rawProjectId.trim().length > 0
        ? rawProjectId.trim()
        : null

  return { valid: true, text, projectId }
}

function jsonResponse(
  body: unknown,
  init: ResponseInit & { mode: 'guest' | 'user' }
) {
  const headers = new Headers(init.headers)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Mode', init.mode)

  return NextResponse.json(body, {
    ...init,
    headers,
  })
}

export const SYSTEM_PROMPT = `Kamu adalah analis BRD (Business Requirements Document) berpengalaman untuk Product Manager di Indonesia.

Analisis BRD yang diberikan dan kembalikan hasil dalam format JSON valid — tanpa markdown, tanpa code block, langsung JSON saja.

Format output (ikuti persis):
{
  "gapList": [
    {
      "category": "<kategori, contoh: Edge Case | Non-Functional Requirement | Role Definition | Acceptance Criteria | Dependency>",
      "description": "<deskripsi gap dalam Bahasa Indonesia, 1-2 kalimat>",
      "severity": "<high | medium | low>",
      "confidence": "<high | medium | low>",
      "reference": "<kutipan pendek atau nama bagian dari BRD yang menjadi dasar analisis, atau null>"
    }
  ],
  "clarificationQuestions": [
    "<pertanyaan klarifikasi dalam Bahasa Indonesia>"
  ],
  "readinessScore": <angka integer 0-100>,
  "readinessLabel": "<'Siap' jika skor >=80, 'Perlu Klarifikasi' jika skor >=50, 'Tidak Siap' jika skor <50>"
}

BATAS OUTPUT KETAT:
- Maksimal 10 gap paling kritis (prioritaskan high severity)
- Maksimal 5 clarification questions (yang paling penting)
- Deskripsi gap: 1 kalimat singkat, padat
- Untuk setiap gap, confidence wajib diisi:
  - "high": gap explicitly missing, tidak ada di BRD sama sekali
  - "medium": gap ambiguous, ada indikasi tetapi tidak jelas
  - "low": gap mungkin ada tetapi tersirat/tersembunyi di bagian lain
- Reference wajib berbasis isi BRD. Jika ada bagian/kutipan yang jelas, pakai kutipan pendek atau nama bagian. Jika tidak ada kutipan atau bagian yang jelas, isi reference dengan null

Panduan penilaian readinessScore:
- 80-100: BRD lengkap, minim gap, siap dikerjakan engineering
- 50-79: Ada gap signifikan yang perlu klarifikasi sebelum development
- 0-49: Banyak gap kritis, BRD perlu ditulis ulang atau dilengkapi

Fokus pencarian gap pada:
- Edge cases yang tidak tercakup (offline, error state, concurrent access)
- Non-functional requirements yang hilang (performa, keamanan, skalabilitas, availability)
- Role dan ownership yang tidak jelas (siapa approver, siapa yang maintain)
- Acceptance criteria yang ambigu atau tidak dapat diuji
- Dependensi teknis atau pihak ketiga yang tidak disebutkan
- Asumsi yang tidak didokumentasikan`

export function buildSystemPromptWithContext(projectContext?: {
  name: string
  context: ProjectContext
}): string {
  if (!projectContext) return SYSTEM_PROMPT

  const { name, context } = projectContext
  const lines: string[] = [`KONTEKS PROJECT: ${name}`, '']

  // Business context
  if (context.business.description) lines.push(`Deskripsi Bisnis: ${context.business.description}`)
  if (context.business.domain) lines.push(`Domain: ${context.business.domain}`)
  if (context.business.targetUsers.length > 0) lines.push(`Target Users: ${context.business.targetUsers.join(', ')}`)
  if (context.business.compliance.length > 0) lines.push(`Compliance: ${context.business.compliance.join(', ')}`)

  // Technical context
  if (context.technical.frontend) lines.push(`Frontend: ${context.technical.frontend}`)
  if (context.technical.backend) lines.push(`Backend: ${context.technical.backend}`)
  if (context.technical.existingSystems.length > 0) lines.push(`Existing Systems: ${context.technical.existingSystems.join(', ')}`)
  if (context.technical.constraints.length > 0) lines.push(`Constraints: ${context.technical.constraints.join(', ')}`)

  return `${SYSTEM_PROMPT}\n\n${lines.join('\n')}`
}

export async function POST(request: NextRequest) {
  const mode = request.headers.get('x-guest-mode') === '1' ? 'guest' : 'user'

  // Hoist to function scope so they're accessible in the background IIFE
  let supabase: Awaited<ReturnType<typeof createClient>> | undefined
  let user: { id: string } | null = null
  let sessionId: string | undefined
  let wordCount: number | undefined
  let startTime: number | undefined
  let projectContext: { name: string; context: ProjectContext } | undefined

  if (mode === 'guest') {
    // Server-side rate limit for unauthenticated (guest) requests
    const ip = getClientIp(request)
    const { allowed } = checkGuestRateLimit(ip)
    if (!allowed) {
      return jsonResponse(
        { error: 'Rate limit exceeded', message: 'Batas analisis tercapai. Masuk untuk melanjutkan.', mode },
        { status: 429, mode }
      )
    }
  } else {
    // Require a valid authenticated session for non-guest requests
    supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Login diperlukan.', mode },
        { status: 401, mode }
      )
    }
    user = authUser

    // Generate a session ID for event logging
    sessionId = crypto.randomUUID()

    // Check usage limit before proceeding
    const usageResult = await checkUsage(supabase, user.id)
    if (!usageResult.allowed) {
      const headers = new Headers()
      headers.set('X-Limit-Reached', 'true')
      return jsonResponse(
        { error: 'Limit reached', count: usageResult.count, limit: usageResult.limit, plan: usageResult.plan, mode },
        { status: 429, mode, headers }
      )
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse(
      { error: 'Invalid JSON', message: 'Request body tidak valid.', mode },
      { status: 400, mode }
    )
  }

  const validation = validateAnalyzePayload(body)
  if (!validation.valid) {
    return jsonResponse(
      {
        error: validation.error,
        message: validation.error,
        mode,
      },
      { status: validation.status, mode }
    )
  }

  // Server-side Pro plan check: fetch project context only for Pro users
  if (validation.projectId && supabase && user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = (sub?.plan as 'free' | 'pro') || 'free'

    if (plan === 'pro') {
      const { data: project } = await supabase
        .from('projects')
        .select('name, context')
        .eq('id', validation.projectId)
        .single()  // RLS enforced — returns null if not owned by user

      if (project) {
        projectContext = {
          name: project.name as string,
          context: project.context as ProjectContext,
        }
      }
    }
    // If plan === 'free' or project not found: projectContext stays undefined
  }

  // Log analysis_started and record start time for authenticated users
  if (user && supabase && sessionId !== undefined) {
    wordCount = validation.text.split(/\s+/).length
    await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_started', wordCount)
    startTime = Date.now()
  }

  // --- Start SSE stream ---
  const { readable, enqueue, close, error: streamError } = createSSEStream()

  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Mode': mode,
  })

  // Run streaming in background — do NOT await before returning Response
  ;(async () => {
    // Step 1: API key check
    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('[api/analyze] step1: ANTHROPIC_API_KEY present:', !!apiKey, '| length:', apiKey?.length ?? 0)
    if (!apiKey) {
      console.error('[api/analyze] FATAL: ANTHROPIC_API_KEY is missing from process.env')
      streamError('Konfigurasi server error. Hubungi admin.')
      return
    }

    let accumulated = ''
    try {
      console.log('[api/analyze] step2: starting Anthropic stream | model: claude-haiku-4-5-20251001 | textLen:', validation.text.length)
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        temperature: 0,
        system: buildSystemPromptWithContext(projectContext),
        messages: [
          {
            role: 'user',
            content: `Analisis BRD berikut dan kembalikan JSON valid (tanpa markdown):\n\n${validation.text}`,
          },
        ],
      })

      let deltaCount = 0
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          accumulated += event.delta.text
          deltaCount++
          enqueue(sseEvent('delta', { text: event.delta.text }))
        }
      }
      console.log('[api/analyze] step3: stream finished | deltas received:', deltaCount, '| accumulated length:', accumulated.length)

      // Clean and parse accumulated JSON
      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()

      if (!cleaned) {
        console.error('[api/analyze] empty response from Anthropic')
        streamError('AI returned empty response. Coba lagi.')
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(cleaned)
      } catch (parseErr) {
        console.error('[api/analyze] JSON parse failed, raw:', accumulated.slice(0, 200))
        streamError('Terjadi kesalahan. Coba lagi.')
        return
      }

      // Increment usage and log completion — fire-and-forget so failures don't kill the done event
      if (user && supabase && sessionId !== undefined) {
        incrementUsage(supabase, user.id).catch(e => console.error('[api/analyze] incrementUsage failed:', e))
        logAnalysisEvent(
          supabase,
          user.id,
          sessionId,
          'analysis_completed',
          wordCount,
          startTime !== undefined ? Date.now() - startTime : undefined
        ).catch(e => console.error('[api/analyze] logEvent failed:', e))
      }

      enqueue(sseEvent('done', parsed))
      close()
    } catch (err) {
      // Log full error — SDK APIError has non-enumerable fields, so we extract them explicitly
      const errDetails = err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            // @ts-expect-error Anthropic SDK APIError fields
            status: (err as { status?: number }).status,
            // @ts-expect-error Anthropic SDK APIError fields
            error: (err as { error?: unknown }).error,
            stack: err.stack,
          }
        : err
      console.error('[api/analyze] stream error (full):', JSON.stringify(errDetails, null, 2))
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers: responseHeaders })
}
