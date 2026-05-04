import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MAX_ANALYZE_TEXT_CHARS = 150_000

type AnalyzeValidationResult =
  | { valid: true; text: string }
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

  return { valid: true, text }
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

export async function POST(request: NextRequest) {
  const mode = request.headers.get('x-guest-mode') === '1' ? 'guest' : 'user'

  // Require either a guest-mode header or an authenticated session
  if (mode !== 'guest') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Login diperlukan.', mode },
        { status: 401, mode }
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

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analisis BRD berikut dan kembalikan JSON valid (tanpa markdown):\n\n${validation.text}`,
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
    return jsonResponse(parsed, { status: 200, mode })
  } catch (err) {
    console.error('[api/analyze] error:', err)
    return jsonResponse(
      {
        error: 'Terjadi kesalahan. Coba lagi.',
        message: 'Terjadi kesalahan. Coba lagi.',
        mode,
      },
      { status: 500, mode }
    )
  }
}
