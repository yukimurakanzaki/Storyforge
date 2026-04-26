import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

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

BATAS OUTPUT KETAT:
- Maksimal 10 gap paling kritis (prioritaskan high severity)
- Maksimal 5 clarification questions (yang paling penting)
- Deskripsi gap: 1 kalimat singkat, padat

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

  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
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
    })

    const text_content = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const cleaned = text_content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[api/analyze] error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
