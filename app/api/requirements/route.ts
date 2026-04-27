import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResult, ChatMessage } from '@/types'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Kamu adalah senior product analyst yang mengubah BRD dan hasil klarifikasi menjadi User Stories siap pakai.

INSTRUKSI:
- Hasilkan maksimal 6 User Stories yang paling penting berdasarkan BRD dan diskusi
- Setiap story harus INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable
- Setiap story memiliki 1-3 Gherkin scenarios (Given/When/Then)
- Field Context Table hanya diisi jika story melibatkan form input / field data — jika tidak ada form, omit fieldContextTable
- Gunakan Bahasa Indonesia untuk semua teks
- Kembalikan JSON valid tanpa markdown

FORMAT JSON WAJIB:
{
  "userStories": [
    {
      "title": "string — nama singkat story",
      "asA": "string — peran user (cth: pengguna terdaftar)",
      "iWant": "string — aksi yang diinginkan",
      "soThat": "string — manfaat yang didapat",
      "investNotes": {
        "independent": "string — kenapa story ini tidak bergantung pada story lain",
        "negotiable": "string — aspek apa yang bisa dinegosiasi",
        "valuable": "string — nilai bisnis yang dihasilkan",
        "estimable": "string — estimasi kasar effort",
        "small": "string — kenapa cukup kecil untuk satu sprint",
        "testable": "string — bagaimana story ini diuji"
      },
      "acceptanceCriteria": [
        {
          "title": "string — nama skenario",
          "given": ["string — kondisi awal"],
          "when": ["string — aksi yang dilakukan"],
          "then": ["string — hasil yang diharapkan"]
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

  const gapSummary = initialAnalysis.gapList
    .map((g) => `  - [${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
    .join('\n')

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'PM' : 'Analis'}: ${m.content}`)
    .join('\n\n')

  const userMessage = `BRD ASLI:\n${brdText}\n\nHASIL ANALISIS:\n- Readiness Score: ${initialAnalysis.readinessScore}/100\n- Gap yang ditemukan:\n${gapSummary}\n\nDISKUSI KLARIFIKASI:\n${conversationHistory}\n\nBuat User Stories lengkap berdasarkan semua konteks di atas. Sertakan generatedAt dengan timestamp sekarang dalam ISO 8601.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
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

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[api/requirements] error:', err)
    return NextResponse.json({ error: 'Gagal membuat user stories. Coba lagi.' }, { status: 500 })
  }
}
