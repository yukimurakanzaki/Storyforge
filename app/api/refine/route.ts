import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisResult, ChatMessage, QAAnswer } from '@/types'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

Aturan readinessScore:
- 80-100: BRD lengkap, siap dikerjakan engineering
- 50-79: Ada gap signifikan
- 0-49: Banyak gap kritis

Turn saat ini: ${turnNumber}. Jika turnNumber >= 5 atau readinessScore >= 80, set readyToFinalize: true.
Gunakan Bahasa Indonesia yang natural.

Kembalikan JSON valid TANPA markdown, TANPA code block:
{"message":"<respons percakapan>","readyToFinalize":false,"analysis":{"gapList":[{"category":"...","description":"...","severity":"high|medium|low"}],"clarificationQuestions":["..."],"readinessScore":0,"readinessLabel":"Perlu Klarifikasi"}}`
}

interface RefineResponse {
  message: string
  readyToFinalize: boolean
  analysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'>
}

export async function POST(request: NextRequest) {
  const {
    brdText,
    initialAnalysis,
    messages,
    qaAnswers = [],
  }: {
    brdText: string
    initialAnalysis: AnalysisResult
    messages: ChatMessage[]
    qaAnswers?: QAAnswer[]
  } = await request.json()

  if (!brdText || !initialAnalysis || !messages) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
  }

  const turnNumber = messages.filter((m) => m.role === 'assistant').length

  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      temperature: 0,
      system: buildSystemPrompt(brdText, initialAnalysis, qaAnswers, turnNumber),
      messages: anthropicMessages,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed: RefineResponse = JSON.parse(cleaned)

    return NextResponse.json({
      message: parsed.message,
      readyToFinalize: parsed.readyToFinalize ?? false,
      analysis: parsed.analysis ?? null,
    })
  } catch (err) {
    console.error('[api/refine] error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
