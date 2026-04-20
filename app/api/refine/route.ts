import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResult, ChatMessage } from '@/types'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(
  brdText: string,
  initialAnalysis: AnalysisResult,
  turnNumber: number
): string {
  const gapSummary = initialAnalysis.gapList
    .map((g) => `  - [${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
    .join('\n')

  return `Kamu adalah analis requirements berpengalaman yang membantu Product Manager memperjelas kebutuhan produk.

BRD ASLI:
${brdText}

HASIL ANALISIS AWAL:
- Readiness Score: ${initialAnalysis.readinessScore}/100 (${initialAnalysis.readinessLabel})
- Gap yang ditemukan:
${gapSummary}

INSTRUKSI:
- Tanyakan pertanyaan follow-up berdasarkan jawaban PM untuk memperjelas requirement yang masih ambigu
- Maksimal 2 pertanyaan per respons, jawaban singkat dan padat
- Jika semua gap sudah cukup terjawab, set readyToFinalize: true dan jelaskan apa yang sudah kamu pahami
- Turn saat ini: ${turnNumber} dari 5. Jika turnNumber >= 5, WAJIB set readyToFinalize: true
- Gunakan Bahasa Indonesia yang natural

Kembalikan JSON valid tanpa markdown:
{"message":"<respons kamu>","readyToFinalize":false}`
}

export async function POST(request: NextRequest) {
  const {
    brdText,
    initialAnalysis,
    messages,
  }: {
    brdText: string
    initialAnalysis: AnalysisResult
    messages: ChatMessage[]
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
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0,
      system: buildSystemPrompt(brdText, initialAnalysis, turnNumber),
      messages: anthropicMessages,
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed: { message: string; readyToFinalize: boolean } = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[api/refine] error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
