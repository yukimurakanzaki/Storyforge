import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { sseEvent, createSSEStream } from '@/lib/sse'
import { getModelConfig } from '@/lib/model-selector'
import type { AnalysisResult, ChatMessage, QAAnswer } from '@/types'

export const runtime = 'nodejs'

const MAX_BRD_CHARS = 150_000
const MAX_MESSAGES = 30

function buildQAContext(questions: string[], qaAnswers: QAAnswer[]): string {
  if (questions.length === 0) return ''
  const lines = questions.map((q, i) => {
    const qa = qaAnswers[i]
    if (!qa) return `  Pertanyaan ${i + 1}: ${q}\n  → Belum dijawab`
    if (qa.isOutOfScope) return `  Pertanyaan ${i + 1}: ${q}\n  → Di luar scope (dikecualikan)`
    if (qa.answer.trim()) return `  Pertanyaan ${i + 1}: ${q}\n  → Jawaban: ${qa.answer.trim()}`
    return `  Pertanyaan ${i + 1}: ${q}\n  → Belum dijawab`
  })
  return `JAWABAN PERTANYAAN KLARIFIKASI:\n${lines.join('\n')}`
}

function buildSystemPrompt(
  brdText: string,
  currentAnalysis: AnalysisResult,
  qaAnswers: QAAnswer[],
  turnNumber: number
): string {
  const gapSummary = currentAnalysis.gapList
    .map((g) => `  - [${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
    .join('\n')

  const qaContext = buildQAContext(currentAnalysis.clarificationQuestions, qaAnswers)

  return `Kamu adalah analis requirements berpengalaman yang membantu Product Manager memperjelas kebutuhan produk.

BRD ASLI:
${brdText}

ANALISIS SAAT INI:
- Readiness Score: ${currentAnalysis.readinessScore}/100 (${currentAnalysis.readinessLabel})
- Gap yang ditemukan:
${gapSummary || '  (tidak ada)'}

${qaContext}

INSTRUKSI:
Berdasarkan percakapan terbaru dan jawaban Q&A di atas, lakukan DUA hal sekaligus:

1. ANALISIS ULANG: Perbarui gap list dan readiness score. Tutup gap yang sudah terjawab. Tambahkan gap baru jika percakapan mengungkap masalah baru.
2. RESPONS PERCAKAPAN: Jelaskan secara natural — gap mana yang sudah tertutup, gap baru (jika ada), dan satu saran konkret untuk langkah berikutnya.

KELOLA clarificationQuestions — WAJIB DIPERBARUI setiap turn:
- Hapus pertanyaan yang SUDAH terjawab dari list (ada jawaban di Q&A di atas)
- Pertahankan pertanyaan yang BELUM terjawab
- Tambahkan pertanyaan follow-up BARU jika percakapan mengungkap gap baru yang butuh klarifikasi
- Jika semua pertanyaan sudah terjawab dan tidak ada gap baru, kembalikan array kosong []

Aturan readinessScore:
- 80-100: BRD lengkap, siap dikerjakan engineering
- 50-79: Ada gap signifikan
- 0-49: Banyak gap kritis

Turn saat ini: ${turnNumber}. Jika turnNumber >= 5 atau readinessScore >= 80, set readyToFinalize: true.
Gunakan Bahasa Indonesia yang natural.

Kembalikan JSON valid TANPA markdown, TANPA code block:
{"message":"<respons percakapan>","readyToFinalize":false,"analysis":{"gapList":[{"category":"...","description":"...","severity":"high|medium|low"}],"clarificationQuestions":["pertanyaan yang belum terjawab + follow-up baru"],"readinessScore":0,"readinessLabel":"Perlu Klarifikasi"}}`
}

interface RefineResponse {
  message: string
  readyToFinalize: boolean
  analysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'>
}

export async function POST(request: NextRequest) {
  // Auth guard: require authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Login diperlukan.' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { brdText, initialAnalysis, messages, qaAnswers = [] } = body as {
    brdText?: unknown
    initialAnalysis?: unknown
    messages?: unknown
    qaAnswers?: QAAnswer[]
  }

  if (typeof brdText !== 'string' || !brdText.trim()) {
    return NextResponse.json({ error: 'Missing brdText' }, { status: 400 })
  }
  if (brdText.length > MAX_BRD_CHARS) {
    return NextResponse.json({ error: 'BRD text too large' }, { status: 413 })
  }
  if (!initialAnalysis || typeof initialAnalysis !== 'object') {
    return NextResponse.json({ error: 'Missing initialAnalysis' }, { status: 400 })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages' }, { status: 400 })
  }

  const typedMessages = messages as ChatMessage[]
  if (typedMessages[typedMessages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
  }

  const typedAnalysis = initialAnalysis as AnalysisResult
  const turnNumber = typedMessages.filter((m) => m.role === 'assistant').length

  const anthropicMessages = typedMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Determine AI model based on user's plan
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan as 'free' | 'pro') || 'free'
  const modelConfig = getModelConfig(plan)

  // --- Start SSE stream ---
  const { readable, enqueue, close, error: streamError } = createSSEStream()

  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })

  // Run streaming in background (do not await — return Response immediately)
  ;(async () => {
    let accumulated = ''
    try {
      const stream = anthropic.messages.stream({
        model: modelConfig.model,
        max_tokens: 6000,
        temperature: 0,
        system: buildSystemPrompt(brdText, typedAnalysis, qaAnswers, turnNumber),
        messages: anthropicMessages,
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          accumulated += event.delta.text
          enqueue(sseEvent('delta', { text: event.delta.text }))
        }
      }

      const cleaned = accumulated.replace(/```(?:json)?/gi, '').trim()

      let parsed: RefineResponse
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        console.error('[api/refine] JSON parse failed, raw:', cleaned.slice(0, 200))
        streamError('Terjadi kesalahan. Coba lagi.')
        return
      }

      enqueue(sseEvent('done', {
        message: parsed.message,
        readyToFinalize: parsed.readyToFinalize ?? false,
        analysis: parsed.analysis ?? null,
      }))
      close()
    } catch (err) {
      console.error('[api/refine] stream error:', err)
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers: responseHeaders })
}
