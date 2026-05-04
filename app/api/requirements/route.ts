import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnalysisResult, ChatMessage } from '@/types'
import { checkGuestRateLimit, getClientIp } from '@/lib/guest-rate-limit'

export const runtime = 'nodejs'

const MAX_BRD_CHARS = 150_000
const MAX_MESSAGES = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Kamu adalah senior product analyst yang mengubah BRD dan hasil klarifikasi menjadi User Stories siap pakai.

INSTRUKSI:
- Hasilkan maksimal 4 User Stories yang paling penting berdasarkan BRD dan diskusi
- Setiap story harus INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable
- Setiap INVEST note: MAKSIMAL 1 kalimat singkat
- Setiap story memiliki 1-2 Gherkin scenarios (Given/When/Then) — tidak lebih
- Setiap Given/When/Then: maksimal 2 item per array
- Field Context Table hanya diisi jika story melibatkan form input / field data — jika tidak ada form, omit fieldContextTable
- Gunakan Bahasa Indonesia untuk semua teks
- Kembalikan JSON valid tanpa markdown — JANGAN potong output di tengah

FORMAT JSON WAJIB:
{
  "userStories": [
    {
      "title": "string — nama singkat story",
      "asA": "string — peran user (cth: pengguna terdaftar)",
      "iWant": "string — aksi yang diinginkan",
      "soThat": "string — manfaat yang didapat",
      "investNotes": {
        "independent": "string",
        "negotiable": "string",
        "valuable": "string",
        "estimable": "string",
        "small": "string",
        "testable": "string"
      },
      "acceptanceCriteria": [
        {
          "title": "string — nama skenario",
          "given": ["string"],
          "when": ["string"],
          "then": ["string"]
        }
      ],
      "fieldContextTable": [
        {
          "fieldName": "string",
          "description": "string",
          "dataType": "string (cth: string, number, boolean, date)",
          "example": "string"
        }
      ]
    }
  ],
  "generatedAt": "ISO 8601 timestamp saat ini"
}`

export async function POST(request: NextRequest) {
  // Auth guard: require session OR guest-mode header
  const isGuest = request.headers.get('x-guest-mode') === '1'
  if (isGuest) {
    const ip = getClientIp(request)
    const { allowed } = checkGuestRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Batas analisis tercapai. Masuk untuk melanjutkan.' },
        { status: 429 }
      )
    }
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { brdText, initialAnalysis, messages } = body as {
    brdText?: unknown
    initialAnalysis?: unknown
    messages?: unknown
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
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }
  if ((messages as unknown[]).length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages' }, { status: 400 })
  }

  const typedAnalysis = initialAnalysis as AnalysisResult
  const typedMessages = messages as ChatMessage[]

  const gapSummary = typedAnalysis.gapList
    .map((g) => `  - [${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
    .join('\n')

  const conversationHistory = typedMessages
    .map((m) => `${m.role === 'user' ? 'PM' : 'Analis'}: ${m.content}`)
    .join('\n\n')

  const userMessage = `BRD ASLI:\n${brdText}\n\nHASIL ANALISIS:\n- Readiness Score: ${typedAnalysis.readinessScore}/100\n- Gap yang ditemukan:\n${gapSummary}\n\nDISKUSI KLARIFIKASI:\n${conversationHistory}\n\nBuat User Stories lengkap berdasarkan semua konteks di atas. Sertakan generatedAt dengan timestamp sekarang dalam ISO 8601.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[api/requirements] JSON parse failed, raw:', cleaned.slice(0, 200))
      return NextResponse.json({ error: 'AI response unreadable. Coba lagi.' }, { status: 422 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[api/requirements] error:', err)
    return NextResponse.json({ error: 'Gagal membuat user stories. Coba lagi.' }, { status: 500 })
  }
}
