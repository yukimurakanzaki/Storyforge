import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { checkUsage, incrementUsage, logAnalysisEvent } from '@/lib/usage'

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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check usage limits
  const usage = await checkUsage(supabase, user.id)
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: 'limit_exceeded',
        message: `Batas analisis bulan ini sudah tercapai (${usage.count}/${usage.limit}). Upgrade ke Pro untuk analisis tak terbatas.`,
        count: usage.count,
        limit: usage.limit,
      },
      { status: 429 }
    )
  }

  const { text } = await request.json()
  const sessionId = crypto.randomUUID()
  const wordCount = text.trim().split(/\s+/).length
  const startTime = Date.now()

  // Log analysis started
  await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_started', wordCount)

  // Stream the analysis
  const encoder = new TextEncoder()
  let accumulated = ''

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
            accumulated += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }

        // After stream completes: save result, increment usage, log completion
        const durationMs = Date.now() - startTime
        try {
          const cleaned = accumulated
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim()
          const parsed = JSON.parse(cleaned)

          await supabase.from('analysis_results').insert({
            user_id: user.id,
            brd_text: text,
            gap_list: parsed.gapList || [],
            clarification_questions: parsed.clarificationQuestions || [],
            readiness_score: parsed.readinessScore || 0,
            readiness_label: parsed.readinessLabel || 'Tidak Siap',
            session_id: sessionId,
          })
        } catch {
          // If parsing fails, still log the event but skip saving result
          console.error('Failed to parse/save analysis result')
        }

        await incrementUsage(supabase, user.id)
        await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_completed', wordCount, durationMs)

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Session-Id': sessionId,
    },
  })
}
