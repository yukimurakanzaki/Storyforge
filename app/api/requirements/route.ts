import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResult, ChatMessage } from '@/types'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(outputTemplate?: string): string {
  const formatInstructions = outputTemplate
    ? `TEMPLATE OUTPUT YANG DIMINTA:\n${outputTemplate}`
    : `FORMAT OUTPUT: Jira Epic/Story standar. Setiap Epic berisi beberapa User Stories. Setiap Story memiliki judul dalam format "Sebagai [role], saya ingin [aksi], agar [manfaat]" jika memungkinkan.`

  return `Kamu adalah analis requirements yang mengubah hasil diskusi klarifikasi BRD menjadi Epic dan User Story yang siap dimasukkan ke Jira.

${formatInstructions}

INSTRUKSI:
- Buat Epic dan Story berdasarkan BRD asli DAN semua klarifikasi dari diskusi
- Setiap acceptance criteria harus terukur dan dapat diuji (bukan "sistem harus baik")
- Gunakan Bahasa Indonesia
- Kembalikan JSON valid tanpa markdown

Format JSON:
{
  "epics": [
    {
      "title": "string",
      "description": "string (2-3 kalimat konteks bisnis)",
      "stories": [
        {
          "title": "string",
          "description": "string",
          "acceptanceCriteria": ["string"]
        }
      ]
    }
  ],
  "generatedAt": "ISO 8601 timestamp"
}`
}

export async function POST(request: NextRequest) {
  const {
    brdText,
    initialAnalysis,
    messages,
    outputTemplate,
  }: {
    brdText: string
    initialAnalysis: AnalysisResult
    messages: ChatMessage[]
    outputTemplate?: string
  } = await request.json()

  if (!brdText || !initialAnalysis || !messages) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const gapSummary = initialAnalysis.gapList
    .map((g) => `  - [${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
    .join('\n')

  const contextMessage = `BRD ASLI:\n${brdText}\n\nHASIL ANALISIS AWAL:\n- Readiness Score: ${initialAnalysis.readinessScore}/100\n- Gap yang ditemukan:\n${gapSummary}\n\nHASIL DISKUSI KLARIFIKASI:\n${messages.map((m) => `${m.role === 'user' ? 'PM' : 'Analis'}: ${m.content}`).join('\n\n')}\n\nBuat Epic dan User Story lengkap berdasarkan BRD dan diskusi di atas. Sertakan generatedAt dengan timestamp sekarang dalam format ISO 8601.`

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          temperature: 0,
          system: buildSystemPrompt(outputTemplate),
          messages: [{ role: 'user', content: contextMessage }],
          stream: true,
        })

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
}
