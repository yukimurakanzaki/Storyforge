import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Kamu adalah analis BRD (Business Requirements Document) berpengalaman untuk Product Manager di Indonesia.

Analisis BRD yang diberikan dan kembalikan hasil dalam format JSON valid — tanpa markdown, tanpa code block, langsung JSON saja.

Format output (ikuti persis):
{
  "gapList": [
    {
      "category": "<kategori, contoh: Edge Case | Non-Functional Requirement | Role Definition | Acceptance Criteria | Dependency>",
      "description": "<deskripsi gap dalam Bahasa Indonesia, 1-2 kalimat>",
      "severity": "<high | medium | low>"
    }
  ],
  "clarificationQuestions": [
    "<pertanyaan klarifikasi dalam Bahasa Indonesia>"
  ],
  "readinessScore": <angka integer 0-100>,
  "readinessLabel": "<'Siap' jika skor >=80, 'Perlu Klarifikasi' jika skor >=50, 'Tidak Siap' jika skor <50>"
}

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

export async function POST(request: NextRequest) {
  const { text } = await request.json()

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Analisis BRD berikut dan kembalikan JSON valid (tanpa markdown):\n\n${text}`,
            },
          ],
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
