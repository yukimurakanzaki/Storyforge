# Iterative Refinement & Requirements Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `/analyze` with a post-analysis chat loop that refines gaps into a Jira-style Epic/Story breakdown, exportable as markdown or clipboard copy, and saved to Supabase on finalization.

**Architecture:** Hybrid client/server — conversation history lives in React state, each `/api/refine` call receives the full history and returns structured JSON. On finalize, `/api/requirements` generates the Epic/Story breakdown, then `/api/save-session` persists the full session to `analysis_history` in two phases (before and after requirements generation). Layout switches via a `phase` state machine on the analyze page.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Anthropic SDK (`claude-haiku-4-5-20251001`), Supabase (service role key for server-side saves), Vitest for pure-function unit tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/requirements-markdown.ts` | Pure fn: `RequirementsResult` → markdown string |
| Create | `lib/supabase/service.ts` | Supabase client with service role key (bypasses RLS) |
| Create | `app/api/refine/route.ts` | One turn of refinement chat → `{ message, readyToFinalize }` |
| Create | `app/api/requirements/route.ts` | Full conversation → Epic/Story JSON |
| Create | `app/api/save-session/route.ts` | Phase-1 insert + Phase-2 update to `analysis_history` |
| Create | `components/analyze/RefinementChat.tsx` | Chat thread + input + Finalize button |
| Create | `components/analyze/RequirementsExport.tsx` | Copy-to-clipboard + download `.md` |
| Create | `components/analyze/RequirementsPanel.tsx` | Epic/Story display + embeds RequirementsExport |
| Modify | `types/index.ts` | Add `Phase`, `ChatMessage`, `Story`, `Epic`, `RequirementsResult` |
| Modify | `app/(app)/analyze/page.tsx` | Phase state machine, layout switching, API wiring |
| Create | `vitest.config.ts` | Vitest config |
| Create | `tests/requirements-markdown.test.ts` | Unit tests for markdown generator |
| SQL | Supabase dashboard migration | Add 3 columns to `analysis_history` |

---

## Task 1: Supabase Schema Migration

**Files:**
- SQL run in Supabase dashboard (no migration file in repo for now)

- [ ] **Step 1: Run migration SQL in Supabase dashboard**

Go to Supabase → SQL Editor and run:

```sql
ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS refinement_messages jsonb,
  ADD COLUMN IF NOT EXISTS requirements         jsonb,
  ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'done';
```

- [ ] **Step 2: Verify columns exist**

In Supabase → Table Editor → `analysis_history`, confirm three new columns: `refinement_messages` (jsonb, nullable), `requirements` (jsonb, nullable), `status` (text, default 'done').

- [ ] **Step 3: Commit a note**

```bash
git commit --allow-empty -m "chore: supabase migration applied — analysis_history +3 cols"
```

---

## Task 2: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/requirements-markdown.test.ts` (placeholder, filled in Task 3)

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Create placeholder test file**

```typescript
// tests/requirements-markdown.test.ts
import { describe, it } from 'vitest'

describe('requirements-markdown', () => {
  it.todo('placeholder — filled in Task 3')
})
```

- [ ] **Step 5: Run tests to confirm setup works**

```bash
npm test
```

Expected: 1 test suite, 0 passed, 1 todo. No errors.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/requirements-markdown.test.ts package.json package-lock.json
git commit -m "chore: add vitest"
```

---

## Task 3: Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add new types to `types/index.ts`**

Append after the existing `UserSubscription` type:

```typescript
export type Phase = 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Story {
  title: string
  description: string
  acceptanceCriteria: string[]
}

export interface Epic {
  title: string
  description: string
  stories: Story[]
}

export interface RequirementsResult {
  epics: Epic[]
  generatedAt: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Phase, ChatMessage, Epic, Story, RequirementsResult types"
```

---

## Task 4: Markdown Generator (TDD)

**Files:**
- Create: `lib/requirements-markdown.ts`
- Modify: `tests/requirements-markdown.test.ts`

- [ ] **Step 1: Write failing tests**

Replace `tests/requirements-markdown.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest'
import { buildMarkdown } from '@/lib/requirements-markdown'
import { RequirementsResult } from '@/types'

const SAMPLE: RequirementsResult = {
  generatedAt: '2026-04-14T00:00:00.000Z',
  epics: [
    {
      title: 'Notifikasi Pembayaran',
      description: 'Epic untuk sistem notifikasi.',
      stories: [
        {
          title: 'Terima notifikasi push',
          description: 'Sebagai pengguna, saya ingin menerima notifikasi push.',
          acceptanceCriteria: [
            'Notifikasi terkirim dalam 5 detik',
            'Notifikasi menampilkan nominal transaksi',
          ],
        },
      ],
    },
    {
      title: 'Preferensi Notifikasi',
      description: 'Epic untuk pengaturan notifikasi.',
      stories: [
        {
          title: 'Nonaktifkan notifikasi',
          description: 'Sebagai pengguna, saya ingin menonaktifkan notifikasi.',
          acceptanceCriteria: ['Toggle tersedia di halaman Pengaturan'],
        },
      ],
    },
  ],
}

describe('buildMarkdown', () => {
  it('includes epic titles as h2', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('## Notifikasi Pembayaran')
    expect(md).toContain('## Preferensi Notifikasi')
  })

  it('includes story titles as h3', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('### Terima notifikasi push')
    expect(md).toContain('### Nonaktifkan notifikasi')
  })

  it('includes acceptance criteria as bullet points', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('- Notifikasi terkirim dalam 5 detik')
    expect(md).toContain('- Notifikasi menampilkan nominal transaksi')
  })

  it('separates epics with horizontal rule', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('---')
  })

  it('handles single epic with no separator', () => {
    const single: RequirementsResult = {
      generatedAt: '2026-04-14T00:00:00.000Z',
      epics: [SAMPLE.epics[0]],
    }
    const md = buildMarkdown(single)
    expect(md).not.toContain('---')
  })

  it('returns empty string for empty epics', () => {
    const empty: RequirementsResult = { generatedAt: '2026-04-14T00:00:00.000Z', epics: [] }
    expect(buildMarkdown(empty)).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '@/lib/requirements-markdown'"

- [ ] **Step 3: Create `lib/requirements-markdown.ts`**

```typescript
import { RequirementsResult } from '@/types'

export function buildMarkdown(requirements: RequirementsResult): string {
  if (requirements.epics.length === 0) return ''

  return requirements.epics
    .map((epic) => {
      const storiesMarkdown = epic.stories
        .map((story) => {
          const criteria = story.acceptanceCriteria
            .map((c) => `- ${c}`)
            .join('\n')
          return `### ${story.title}\n\n${story.description}\n\n**Acceptance Criteria:**\n${criteria}`
        })
        .join('\n\n')
      return `## ${epic.title}\n\n${epic.description}\n\n${storiesMarkdown}`
    })
    .join('\n\n---\n\n')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: 6 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add lib/requirements-markdown.ts tests/requirements-markdown.test.ts
git commit -m "feat: add buildMarkdown utility with tests"
```

---

## Task 5: Supabase Service Client

**Files:**
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: Create `lib/supabase/service.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/service.ts
git commit -m "feat: add supabase service role client"
```

---

## Task 6: `/api/save-session` Route

**Files:**
- Create: `app/api/save-session/route.ts`

- [ ] **Step 1: Create `app/api/save-session/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createServiceClient()

  // Phase 2: update existing row with requirements
  if (body.sessionId && body.requirements) {
    const { error } = await supabase
      .from('analysis_history')
      .update({
        requirements: body.requirements,
        status: 'done',
      })
      .eq('session_id', body.sessionId)

    if (error) {
      console.error('[save-session] phase-2 update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // Phase 1: insert new row
  const { sessionId, brdText, initialAnalysis, messages } = body

  if (!sessionId || !brdText || !initialAnalysis) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('analysis_history')
    .upsert(
      {
        session_id: sessionId,
        brd_text: brdText,
        initial_analysis: initialAnalysis,
        refinement_messages: messages ?? [],
        status: 'finalizing',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )

  if (error) {
    console.error('[save-session] phase-1 upsert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/save-session/route.ts
git commit -m "feat: add /api/save-session route (two-phase upsert)"
```

---

## Task 7: `/api/refine` Route

**Files:**
- Create: `app/api/refine/route.ts`

- [ ] **Step 1: Create `app/api/refine/route.ts`**

```typescript
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

  // Turn number = number of assistant messages so far
  const turnNumber = messages.filter((m) => m.role === 'assistant').length

  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test with curl (dev server must be running: `npm run dev`)**

```bash
curl -s -X POST http://localhost:3000/api/refine \
  -H "Content-Type: application/json" \
  -d '{
    "brdText": "Fitur login dengan email dan password.",
    "initialAnalysis": {
      "gapList": [{"category":"Edge Case","description":"Tidak ada flow reset password","severity":"high"}],
      "clarificationQuestions": ["Bagaimana flow reset password?"],
      "readinessScore": 45,
      "readinessLabel": "Tidak Siap",
      "sessionId": "test-123",
      "createdAt": "2026-04-14T00:00:00.000Z"
    },
    "messages": [
      {"role":"assistant","content":"Berdasarkan analisis BRD kamu, ada beberapa hal yang perlu klarifikasi:\n1. Bagaimana flow reset password?"},
      {"role":"user","content":"Reset password via link ke email, berlaku 1 jam."}
    ]
  }'
```

Expected: streaming JSON like `{"message":"Terima kasih...","readyToFinalize":false}`

- [ ] **Step 4: Commit**

```bash
git add app/api/refine/route.ts
git commit -m "feat: add /api/refine route"
```

---

## Task 8: `/api/requirements` Route

**Files:**
- Create: `app/api/requirements/route.ts`

- [ ] **Step 1: Create `app/api/requirements/route.ts`**

```typescript
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

  const contextMessage = `BRD ASLI:\n${brdText}\n\nHASIL ANALISIS AWAL:\n- Readiness Score: ${initialAnalysis.readinessScore}/100\n- Gap yang ditemukan:\n${gapSummary}\n\nHASIL DISKUSI KLARIFIKASI:\n${messages.map((m) => `${m.role === 'user' ? 'PM' : 'Analis'}: ${m.content}`).join('\n\n')}\n\nBuat Epic dan User Story lengkap berdasarkan BRD dan diskusi di atas. Sertakan generatedAt dengan timestamp sekarang.`

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test with curl (dev server running)**

```bash
curl -s -X POST http://localhost:3000/api/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "brdText": "Fitur login dengan email dan password.",
    "initialAnalysis": {
      "gapList": [{"category":"Edge Case","description":"Tidak ada flow reset password","severity":"high"}],
      "clarificationQuestions": ["Bagaimana flow reset password?"],
      "readinessScore": 45,
      "readinessLabel": "Tidak Siap",
      "sessionId": "test-123",
      "createdAt": "2026-04-14T00:00:00.000Z"
    },
    "messages": [
      {"role":"assistant","content":"Bagaimana flow reset password?"},
      {"role":"user","content":"Reset password via link ke email, berlaku 1 jam."}
    ]
  }'
```

Expected: streaming JSON with `epics` array.

- [ ] **Step 4: Commit**

```bash
git add app/api/requirements/route.ts
git commit -m "feat: add /api/requirements route"
```

---

## Task 9: `RequirementsExport` Component

**Files:**
- Create: `components/analyze/RequirementsExport.tsx`

- [ ] **Step 1: Create `components/analyze/RequirementsExport.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { RequirementsResult } from '@/types'
import { Button } from '@/components/ui/Button'
import { buildMarkdown } from '@/lib/requirements-markdown'

interface RequirementsExportProps {
  requirements: RequirementsResult
}

export function RequirementsExport({ requirements }: RequirementsExportProps) {
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState(false)

  const markdown = buildMarkdown(requirements)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — show fallback textarea
      setFallback(true)
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requirements-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleCopy} className="flex-1">
          {copied ? '✓ Tersalin!' : 'Copy semua'}
        </Button>
        <Button variant="secondary" onClick={handleDownload} className="flex-1">
          Download .md
        </Button>
      </div>

      {fallback && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500">
            Browser tidak mendukung copy otomatis. Pilih semua teks di bawah dan copy manual.
          </p>
          <textarea
            readOnly
            value={markdown}
            rows={6}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/RequirementsExport.tsx
git commit -m "feat: add RequirementsExport component (copy + download)"
```

---

## Task 10: `RequirementsPanel` Component

**Files:**
- Create: `components/analyze/RequirementsPanel.tsx`

- [ ] **Step 1: Create `components/analyze/RequirementsPanel.tsx`**

```tsx
'use client'

import { RequirementsResult } from '@/types'
import { RequirementsExport } from './RequirementsExport'

interface RequirementsPanelProps {
  requirements: RequirementsResult | null
  isLoading: boolean
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
          <div className="ml-4 mt-2 flex flex-col gap-2">
            {[1, 2].map((j) => (
              <div key={j} className="h-3 w-4/6 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function RequirementsPanel({ requirements, isLoading }: RequirementsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Membuat requirements...</p>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!requirements) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-center text-sm text-gray-400">
          Requirements akan muncul setelah kamu klik Finalize
        </p>
      </div>
    )
  }

  if (requirements.epics.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Tidak ada requirement yang dihasilkan. Coba ulangi sesi refinement.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Export Requirements
        </h3>
        <RequirementsExport requirements={requirements} />
      </div>

      <div className="flex flex-col gap-6">
        {requirements.epics.map((epic, epicIdx) => (
          <div key={epicIdx} className="flex flex-col gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">{epic.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{epic.description}</p>
            </div>

            <div className="flex flex-col gap-3 ml-3">
              {epic.stories.map((story, storyIdx) => (
                <div
                  key={storyIdx}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-800">{story.title}</p>
                  {story.description && (
                    <p className="mt-1 text-xs text-gray-500">{story.description}</p>
                  )}
                  {story.acceptanceCriteria.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Acceptance Criteria
                      </p>
                      <ul className="flex flex-col gap-1">
                        {story.acceptanceCriteria.map((ac, acIdx) => (
                          <li key={acIdx} className="flex gap-2 text-xs text-gray-600">
                            <span className="text-indigo-400 mt-px">✓</span>
                            <span>{ac}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/RequirementsPanel.tsx
git commit -m "feat: add RequirementsPanel component"
```

---

## Task 11: `RefinementChat` Component

**Files:**
- Create: `components/analyze/RefinementChat.tsx`

- [ ] **Step 1: Create `components/analyze/RefinementChat.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '@/types'
import { Button } from '@/components/ui/Button'

const MAX_CHARS = 5000
const WARN_CHARS = 4000

interface RefinementChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  readyToFinalize: boolean
  onFinalize: () => void
  isLoading: boolean
  disabled: boolean
}

export function RefinementChat({
  messages,
  onSend,
  readyToFinalize,
  onFinalize,
  isLoading,
  disabled,
}: RefinementChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= WARN_CHARS && !overLimit
  const canSend = input.trim().length > 0 && !overLimit && !isLoading && !disabled

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!canSend) return
    onSend(input.trim())
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Message thread */}
      <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={[
              'max-w-[85%] rounded-xl px-4 py-3 text-sm',
              msg.role === 'assistant'
                ? 'self-start bg-indigo-50 text-gray-800 border border-indigo-100'
                : 'self-end bg-indigo-600 text-white',
            ].join(' ')}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="self-start bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          rows={3}
          placeholder="Jawab pertanyaan di atas... (Enter untuk kirim, Shift+Enter untuk baris baru)"
          className={[
            'w-full resize-none rounded-lg border px-4 py-3 text-sm',
            'placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1',
            overLimit
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800',
          ].join(' ')}
        />

        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              'text-xs tabular-nums',
              overLimit ? 'text-red-600 font-semibold' : nearLimit ? 'text-yellow-600' : 'text-gray-400',
            ].join(' ')}
          >
            {charCount.toLocaleString('id-ID')} / {MAX_CHARS.toLocaleString('id-ID')}
          </span>

          <div className="flex gap-2">
            <div title={readyToFinalize ? '' : 'Claude belum yakin requirement sudah cukup'}>
              <Button
                variant="secondary"
                onClick={onFinalize}
                disabled={!readyToFinalize || disabled}
                className="text-xs"
              >
                Finalize Requirements
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!canSend}
              loading={isLoading}
            >
              Kirim
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/RefinementChat.tsx
git commit -m "feat: add RefinementChat component"
```

---

## Task 12: Wire `AnalyzePage`

**Files:**
- Modify: `app/(app)/analyze/page.tsx`

This is the integration task — connects all the pieces.

- [ ] **Step 1: Replace `app/(app)/analyze/page.tsx` with the full wired version**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import { RefinementChat } from '@/components/analyze/RefinementChat'
import { RequirementsPanel } from '@/components/analyze/RequirementsPanel'
import { SAMPLE_BRD } from '@/lib/constants'
import {
  AnalysisResult,
  ChatMessage,
  Phase,
  RequirementsResult,
} from '@/types'
import Link from 'next/link'

function summarizeBrd(text: string): string {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const paragraphs = text.trim().split(/\n\n+/).filter(Boolean).length
  return `${paragraphs} paragraf · ${words.toLocaleString('id-ID')} kata`
}

function buildFirstAssistantMessage(analysis: AnalysisResult): string {
  if (analysis.clarificationQuestions.length === 0) {
    return 'Analisis BRD selesai. Readiness score cukup tinggi. Klik "Finalize Requirements" jika kamu sudah siap.'
  }
  const numbered = analysis.clarificationQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')
  return `Berdasarkan analisis BRD kamu, ada beberapa hal yang perlu klarifikasi:\n\n${numbered}`
}

export default function AnalyzePage() {
  const [brdText, setBrdText] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [readyToFinalize, setReadyToFinalize] = useState(false)
  const [requirements, setRequirements] = useState<RequirementsResult | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // Warn user before leaving mid-session
  useEffect(() => {
    if (phase !== 'refining' && phase !== 'finalizing') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  async function handleAnalyze(text: string) {
    setPhase('analyzing')
    setResult(undefined)
    setError(undefined)
    setMessages([])
    setReadyToFinalize(false)
    setRequirements(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok || !res.body) {
        setError(`Server error ${res.status}`)
        setPhase('input')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const parsed = JSON.parse(cleaned)
      const analysisResult: AnalysisResult = {
        ...parsed,
        sessionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }

      setResult(analysisResult)
      setMessages([
        {
          role: 'assistant',
          content: buildFirstAssistantMessage(analysisResult),
        },
      ])
      // If readiness is already high enough, pre-signal finalize readiness
      if (analysisResult.readinessScore >= 80) {
        setReadyToFinalize(true)
      }
      setPhase('refining')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
      setPhase('input')
    }
  }

  async function handleSendMessage(text: string) {
    if (!result) return
    setIsRefining(true)
    setError(undefined)

    const userMessage: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brdText,
          initialAnalysis: result,
          messages: nextMessages,
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(messages) // rollback user message
        setError('Gagal mengirim pesan. Coba lagi.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const parsed: { message: string; readyToFinalize: boolean } = JSON.parse(cleaned)

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: parsed.message },
      ])
      if (parsed.readyToFinalize) {
        setReadyToFinalize(true)
      }
    } catch (e) {
      setMessages(messages) // rollback user message
      setError(e instanceof Error ? e.message : 'Gagal mengirim pesan. Coba lagi.')
    } finally {
      setIsRefining(false)
    }
  }

  async function handleFinalize() {
    if (!result) return
    setPhase('finalizing')
    setIsFinalizing(true)
    setError(undefined)

    // Phase 1 save — persist conversation before generating requirements
    try {
      const saveRes = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          brdText,
          initialAnalysis: result,
          messages,
          status: 'finalizing',
        }),
      })
      if (!saveRes.ok) {
        const { error: saveErr } = await saveRes.json()
        setError(`Gagal menyimpan sesi: ${saveErr}. Coba lagi.`)
        setPhase('refining')
        setIsFinalizing(false)
        return
      }
    } catch {
      setError('Gagal menyimpan sesi. Coba lagi.')
      setPhase('refining')
      setIsFinalizing(false)
      return
    }

    // Generate requirements
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brdText,
          initialAnalysis: result,
          messages,
        }),
      })

      if (!res.ok || !res.body) {
        setError('Gagal membuat requirements. Coba lagi.')
        setPhase('refining')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const parsed: RequirementsResult = JSON.parse(cleaned)
      setRequirements(parsed)
      setPhase('done')

      // Phase 2 save — fire and forget (silent retry omitted for brevity)
      fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          requirements: parsed,
          status: 'done',
        }),
      }).catch((err) => console.error('[phase-2 save]', err))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat requirements. Coba lagi.')
      setPhase('refining')
    } finally {
      setIsFinalizing(false)
    }
  }

  const isRefiningPhase = phase === 'refining' || phase === 'finalizing' || phase === 'done'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-gray-800 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analisis BRD</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isRefiningPhase
              ? 'Jawab pertanyaan klarifikasi, lalu klik Finalize untuk generate requirements.'
              : 'Paste BRD kamu di bawah dan klik Analyze untuk mendapatkan laporan kesiapan.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left col */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {!isRefiningPhase ? (
              <BRDInput
                value={brdText}
                onChange={setBrdText}
                onAnalyze={handleAnalyze}
                onSample={() => setBrdText(SAMPLE_BRD)}
                isLoading={phase === 'analyzing'}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {/* BRD summary */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">BRD yang dianalisis</span>
                  <span className="text-xs font-medium text-gray-600">
                    {summarizeBrd(brdText)}
                  </span>
                </div>

                <RefinementChat
                  messages={messages}
                  onSend={handleSendMessage}
                  readyToFinalize={readyToFinalize}
                  onFinalize={handleFinalize}
                  isLoading={isRefining}
                  disabled={phase === 'finalizing' || phase === 'done'}
                />
              </div>
            )}
          </div>

          {/* Right col */}
          {phase === 'input' || phase === 'analyzing' ? (
            <OutputPanel result={result} isLoading={phase === 'analyzing'} />
          ) : phase === 'refining' ? (
            <OutputPanel result={result} isLoading={false} />
          ) : (
            <RequirementsPanel
              requirements={requirements}
              isLoading={isFinalizing}
            />
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/analyze/page.tsx
git commit -m "feat: wire analyze page with phase state machine and refinement loop"
```

---

## Task 13: End-to-End Smoke Test

**Manual test — no automated test for full UI flow.**

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000/analyze`

- [ ] **Step 2: Test happy path**

1. Click "Coba dengan contoh BRD →" to load sample BRD
2. Click "Analyze BRD" — wait for analysis to stream
3. Verify: left col switches to chat with first assistant message showing clarification questions
4. Verify: right col shows OutputPanel with readiness score + gap list
5. Type an answer in the chat input, press Enter
6. Verify: loading dots appear, then assistant responds
7. Continue answering until "Finalize Requirements" button enables
8. Click "Finalize Requirements"
9. Verify: right col switches to RequirementsPanel loading skeleton
10. Verify: Epic/Story breakdown appears with export bar
11. Click "Copy semua" — verify "✓ Tersalin!" flash
12. Click "Download .md" — verify file downloads

- [ ] **Step 3: Test error path — refresh mid-session**

1. Complete steps 1-6 above (mid-session)
2. Try to refresh or close tab
3. Verify: browser shows "leave page?" confirmation dialog

- [ ] **Step 4: Test error path — empty Finalize result**

This can't be easily triggered manually without mocking. Skip for now — the empty-state UI is covered in `RequirementsPanel`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: iterative refinement and requirements generation — complete"
```

---

## Edge Case Coverage Checklist

| Edge Case | Covered in task |
|---|---|
| `/api/refine` network failure | Task 12 — rolls back user message, shows error |
| `/api/requirements` failure | Task 12 — resets to `refining`, shows retry error |
| `/api/save-session` phase-1 failure | Task 12 — blocks finalization, shows error |
| `/api/save-session` phase-2 failure | Task 12 — silent catch, does not block user |
| Empty chat input | Task 11 — `canSend` guard |
| Message over 5000 chars | Task 11 — `overLimit` guard |
| Clipboard API unavailable | Task 9 — fallback textarea |
| Zero epics returned | Task 10 — empty state UI |
| Duplicate Finalize click | Task 12 — button disabled immediately (`isFinalizing`) |
| Refresh mid-session | Task 12 — `beforeunload` handler |
| Claude never signals readyToFinalize | Task 7 — forced at turn 5 via system prompt |
| JSON parse failure (refine/requirements) | Task 12 — caught, shows error |
| High initial readiness score (≥80) | Task 12 — `readyToFinalize` pre-set to true |

---

*Plan written by Claude Code — StoryForge 2026-04-14*
