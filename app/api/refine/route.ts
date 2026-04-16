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
- Maksimal 2 pertanyaan per respons
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

  // Turn number = number of assistant messages so far
  const turnNumber = messages.filter((m) => m.role === 'assistant').length

  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0,
      system: buildSystemPrompt(brdText, initialAnalysis, turnNumber),
      messages: anthropicMessages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[api/refine] error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
