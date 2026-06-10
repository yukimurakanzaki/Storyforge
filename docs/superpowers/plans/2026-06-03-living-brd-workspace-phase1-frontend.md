# Living BRD Workspace — Phase 1 FRONTEND Implementation Plan (Stories 3–7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** The backend plan `2026-06-03-living-brd-workspace-phase1.md` (Stories 1–2 + Task 15 gap route) must be complete. This plan consumes its frozen contract and does NOT change backend behaviour (one small additive GET route in Task F1).

**Goal:** Build the Claude-style 3-zone living workspace UI (sidebar · chat · artifact panel) on top of the completed orchestrator, gated behind `NEXT_PUBLIC_LIVING_WORKSPACE`, with the old `/analyze` flow untouched until flag-flip.

**Architecture:** A `useWorkspace` hook owns session state and talks to `/api/workspace` (SSE) + `/api/workspace/gap` (PATCH). Pure, node-testable logic lives in `lib/workspace/client-state.ts`. Components are dumb and render from `WorkspaceState`. Tests use `renderToStaticMarkup` (matching the repo's existing component-test style — `environment: 'node'`, files `*.test.ts`).

**Tech Stack:** React 18, Next.js App Router (client components), Tailwind, SSE via `@/lib/sse-client` (`readSSEStream`), Vitest (`renderToStaticMarkup` from `react-dom/server`).

---

## Contract consumed (frozen by the backend plan)

| Action | Call | Response |
|---|---|---|
| Send chat / paste BRD | `POST /api/workspace` `{ sessionId, message, projectId? }` | SSE: `status`, then `done: { assistantMessage, intent, resolvedGapIds, state: WorkspaceState }` |
| Answer a gap | `PATCH /api/workspace/gap` `{ sessionId, gapId, answer }` | `{ state }` |
| Dismiss a gap | `PATCH /api/workspace/gap` `{ sessionId, gapId, outOfScope: true }` | `{ state }` |
| Generate/update PRD | `POST /api/workspace` `{ sessionId, message: 'tulis PRD' }` | `done` (state.prd populated) |
| Resume a session | `GET /api/workspace?sessionId=…` (Task F1) | `{ state: WorkspaceState }` |
| List recents | client Supabase select on `analysis_results` | rows ordered by `last_active_at desc` |

`WorkspaceState` / `WorkspaceGap` / `PrdDraft` types come from `@/types/workspace`.

## FE UX constraints (MANDATORY — acceptance criteria on every task)

1. **No sample/example BRD.** `EmptyState.tsx` must NOT include a sample button and must NOT import `SAMPLE_BRD` or `components/analyze/SampleBRD.tsx`.
2. **No invisible elements.** Never the same color token for text and its own background. Primary buttons `bg-teal-600 text-white` (hover `bg-teal-700`); secondary `text-gray-700` on light bg + `border-gray-300`; disabled keeps a readable label via `disabled:opacity-60`. Dark sidebar (`bg-gray-950`) → light text; light panels (`bg-white`) → dark text. Active vs inactive tabs visually distinct. Each component test asserts the visible class combo; each task DoD includes a `npm run dev` visual readability check.

## File map (this plan)

- Create `app/api/workspace/route.ts` → add a `GET` handler (Task F1, additive).
- Create `lib/workspace/client-state.ts` — pure helpers (Task F2).
- Create `hooks/useWorkspace.ts` — session state + actions (Task F3).
- Create `components/analyze/workspace/EmptyState.tsx`, `ChatPanel.tsx` (Tasks F4).
- Create `components/analyze/workspace/WorkspaceShell.tsx`; create `app/(app)/analyze/LegacyAnalyzeClient.tsx` (moved old body); rewrite `app/(app)/analyze/page.tsx` as flag wrapper (Task F5).
- Create `components/analyze/workspace/GapsScorePanel.tsx`, `GapRow.tsx` (Task F6).
- Update `ChatPanel.tsx` — closed-question notices (Task F7).
- Create `components/analyze/workspace/ArtifactPanel.tsx`, `PrdArtifact.tsx` (Task F8).
- Create `components/analyze/workspace/WorkspaceSidebar.tsx` (Task F9).
- Flag-flip cleanup: delete `components/analyze/SampleBRD.tsx` + `SAMPLE_BRD` usage (Task F10).

Tests: `tests/lib/client-state.test.ts`, `tests/components/workspace/EmptyState.test.ts`, `GapsScorePanel.test.ts`, `ArtifactPanel.test.ts`, `PrdArtifact.test.ts`, `WorkspaceSidebar.test.ts`.

---

## Story 3 — Chat-first workspace shell

### Task F1: Resume route (GET /api/workspace)

> `rowToState` uses Node `crypto` and cannot run in the browser, so resume must go through the server. Additive — does not touch the existing POST.

**Files:**
- Modify: `app/api/workspace/route.ts` (add `GET`)

- [ ] **Step 1: Add the GET handler** (append to the file)

```ts
// app/api/workspace/route.ts — add below the existing POST
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const { data: row } = await supabase.from('analysis_results').select('*')
    .eq('session_id', sessionId).eq('user_id', user.id).single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ state: rowToState(row) })
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint && npm run lint:anthropic`
Expected: clean (`rowToState` is already imported in this file from the POST work).

- [ ] **Step 3: Commit**
```bash
git add app/api/workspace/route.ts && git commit -m "feat(workspace): GET resume route"
```

---

### Task F2: Pure client-state helpers

**Files:**
- Create: `lib/workspace/client-state.ts`
- Test: `tests/lib/client-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/client-state.test.ts
import { describe, it, expect } from 'vitest'
import { emptyClientState, withOptimisticUserMessage, partitionGaps, scoreColor, resolvedQuestions } from '@/lib/workspace/client-state'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return { id: 'g', category: 'functional', description: 'd', severity: 'medium', question: 'q',
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null, ...p }
}

describe('client-state', () => {
  it('emptyClientState seeds a usable state', () => {
    const s = emptyClientState('s1')
    expect(s.sessionId).toBe('s1')
    expect(s.gaps).toEqual([])
    expect(s.readinessScore).toBe(100)
  })

  it('withOptimisticUserMessage appends a user message (creating state if null)', () => {
    const s = withOptimisticUserMessage(null, 's1', 'halo')
    expect(s.messages).toEqual([{ role: 'user', content: 'halo' }])
    const s2 = withOptimisticUserMessage(s, 's1', 'lagi')
    expect(s2.messages.map(m => m.content)).toEqual(['halo', 'lagi'])
  })

  it('partitionGaps splits open vs resolved', () => {
    const { open, resolved } = partitionGaps([gap({ id: 'a', status: 'open' }), gap({ id: 'b', status: 'answered' }), gap({ id: 'c', status: 'out_of_scope' })])
    expect(open.map(g => g.id)).toEqual(['a'])
    expect(resolved.map(g => g.id)).toEqual(['b', 'c'])
  })

  it('scoreColor returns a visible (non-background) token per band', () => {
    expect(scoreColor(85)).toBe('text-teal-600')
    expect(scoreColor(60)).toBe('text-amber-600')
    expect(scoreColor(30)).toBe('text-red-600')
  })

  it('resolvedQuestions maps ids to their question text from the pre-update gaps', () => {
    const gaps = [gap({ id: 'a', question: 'Siapa approver?' }), gap({ id: 'b', question: 'Batas waktu?' })]
    expect(resolvedQuestions(gaps, ['b'])).toEqual(['Batas waktu?'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/client-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// lib/workspace/client-state.ts
import type { WorkspaceState, WorkspaceGap } from '@/types/workspace'

export function emptyClientState(sessionId: string): WorkspaceState {
  return {
    sessionId, title: '', brdText: '', gaps: [], readinessScore: 100, readinessLabel: 'Siap',
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: '',
  }
}

export function withOptimisticUserMessage(state: WorkspaceState | null, sessionId: string, text: string): WorkspaceState {
  const base = state ?? emptyClientState(sessionId)
  return { ...base, messages: [...base.messages, { role: 'user', content: text }] }
}

export function partitionGaps(gaps: WorkspaceGap[]): { open: WorkspaceGap[]; resolved: WorkspaceGap[] } {
  return { open: gaps.filter((g) => g.status === 'open'), resolved: gaps.filter((g) => g.status !== 'open') }
}

/** Visible text color per readiness band (never a background token). */
export function scoreColor(score: number): string {
  if (score >= 80) return 'text-teal-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

/** Map resolved gap ids → their question text, using the gaps BEFORE the update was applied. */
export function resolvedQuestions(gapsBefore: WorkspaceGap[], resolvedGapIds: string[]): string[] {
  const byId = new Map(gapsBefore.map((g) => [g.id, g.question]))
  return resolvedGapIds.map((id) => byId.get(id)).filter((q): q is string => !!q)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/client-state.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/workspace/client-state.ts tests/lib/client-state.test.ts
git commit -m "feat(workspace-ui): pure client-state helpers"
```

---

### Task F3: useWorkspace hook

**Files:**
- Create: `hooks/useWorkspace.ts`

> The hook wires the (already-tested) pure helpers to the API. No unit test (repo has no hook-render harness); verified manually in Task F5 and via the component tests that consume its output shape.

- [ ] **Step 1: Implement the hook**

```ts
// hooks/useWorkspace.ts
'use client'
import { useCallback, useRef, useState } from 'react'
import { readSSEStream } from '@/lib/sse-client'
import { emptyClientState, withOptimisticUserMessage, resolvedQuestions } from '@/lib/workspace/client-state'
import type { WorkspaceState } from '@/types/workspace'

export type ArtifactTab = 'gaps' | 'prd'

export interface UseWorkspace {
  sessionId: string
  state: WorkspaceState | null
  isSending: boolean
  error: string | null
  activeTab: ArtifactTab
  lastResolved: string[]
  setActiveTab: (t: ArtifactTab) => void
  sendMessage: (text: string) => Promise<void>
  generatePrd: () => Promise<void>
  answerGap: (gapId: string, answer: string) => Promise<void>
  dismissGap: (gapId: string) => Promise<void>
  startNewSession: () => void
  loadSession: (sessionId: string) => Promise<void>
}

export function useWorkspace(projectId: string | null = null): UseWorkspace {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [state, setState] = useState<WorkspaceState | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ArtifactTab>('gaps')
  const [lastResolved, setLastResolved] = useState<string[]>([])
  const stateRef = useRef<WorkspaceState | null>(null)
  stateRef.current = state

  const post = useCallback(async (message: string) => {
    if (isSending) return
    setError(null); setIsSending(true)
    const before = stateRef.current
    setState(withOptimisticUserMessage(before, sessionId, message))
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, projectId }),
      })
      if (!res.ok) { setError('Gagal memproses. Coba lagi.'); setState(before); return }
      for await (const event of readSSEStream(res)) {
        if (event.name === 'done') {
          const data = event.data as { state: WorkspaceState; resolvedGapIds: string[]; intent: string }
          setLastResolved(resolvedQuestions(before?.gaps ?? [], data.resolvedGapIds ?? []))
          setState(data.state)
          if (data.intent === 'command' && data.state.prd) setActiveTab('prd')
        } else if (event.name === 'error') {
          setError((event.data as { error: string }).error || 'Terjadi kesalahan.'); setState(before)
        }
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.'); setState(before)
    } finally { setIsSending(false) }
  }, [isSending, sessionId, projectId])

  const sendMessage = useCallback((text: string) => post(text), [post])
  const generatePrd = useCallback(() => post('Tolong tulis PRD-nya sekarang.'), [post])

  const patchGap = useCallback(async (body: Record<string, unknown>) => {
    setError(null)
    try {
      const res = await fetch('/api/workspace/gap', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...body }),
      })
      if (!res.ok) { setError('Gagal menyimpan jawaban. Coba lagi.'); return }
      const { state: next } = await res.json() as { state: WorkspaceState }
      setState(next)
    } catch { setError('Gagal menyimpan jawaban. Coba lagi.') }
  }, [sessionId])

  const answerGap = useCallback((gapId: string, answer: string) => patchGap({ gapId, answer }), [patchGap])
  const dismissGap = useCallback((gapId: string) => patchGap({ gapId, outOfScope: true }), [patchGap])

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID()); setState(null); setError(null); setLastResolved([]); setActiveTab('gaps')
  }, [])

  const loadSession = useCallback(async (id: string) => {
    setError(null); setSessionId(id)
    try {
      const res = await fetch(`/api/workspace?sessionId=${encodeURIComponent(id)}`)
      if (!res.ok) { setError('Sesi tidak ditemukan.'); return }
      const { state: loaded } = await res.json() as { state: WorkspaceState }
      setState(loaded); setActiveTab(loaded.prd ? 'prd' : 'gaps')
    } catch { setError('Gagal memuat sesi.') }
  }, [])

  return { sessionId, state: state ?? (null), isSending, error, activeTab, lastResolved,
    setActiveTab, sendMessage, generatePrd, answerGap, dismissGap, startNewSession, loadSession }
}

// keep emptyClientState importable for consumers that want a non-null shell
export { emptyClientState }
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add hooks/useWorkspace.ts && git commit -m "feat(workspace-ui): useWorkspace hook"
```

---

### Task F4: EmptyState + ChatPanel

**Files:**
- Create: `components/analyze/workspace/EmptyState.tsx`
- Create: `components/analyze/workspace/ChatPanel.tsx`
- Test: `tests/components/workspace/EmptyState.test.ts`

- [ ] **Step 1: Write the failing test (no-sample + contrast)**

```ts
// tests/components/workspace/EmptyState.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyState } from '@/components/analyze/workspace/EmptyState'

describe('EmptyState', () => {
  const html = renderToStaticMarkup(createElement(EmptyState, { onSend: () => {}, isSending: false }))

  it('does NOT offer a sample/example BRD', () => {
    expect(html.toLowerCase()).not.toContain('contoh')
    expect(html.toLowerCase()).not.toContain('sample')
  })
  it('renders a visible primary send button (teal bg + white text, not invisible)', () => {
    expect(html).toContain('bg-teal-600')
    expect(html).toContain('text-white')
    expect(html).not.toMatch(/class="[^"]*bg-white[^"]*text-white/) // never white-on-white
  })
  it('renders the composer textarea', () => {
    expect(html).toContain('<textarea')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/workspace/EmptyState.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement EmptyState**

```tsx
// components/analyze/workspace/EmptyState.tsx
'use client'
import { useState } from 'react'

export function EmptyState({ onSend, isSending }: { onSend: (text: string) => void; isSending: boolean }) {
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0 && !isSending
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-gray-900">Mulai analisis requirement</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Tempel BRD atau tulis requirement-mu. StoryForge akan menemukan gap, menanyakan yang belum jelas, dan menulis PRD-nya bersamamu.
      </p>
      <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tempel BRD atau tulis requirement di sini..."
          rows={5}
          className="w-full resize-none bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        <div className="flex justify-end pt-2">
          <button
            onClick={() => { if (canSend) { onSend(text.trim()); setText('') } }}
            disabled={!canSend}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            {isSending ? 'Menganalisis...' : 'Analisis'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement ChatPanel** (notices added in Task F7; base version here)

```tsx
// components/analyze/workspace/ChatPanel.tsx
'use client'
import { useState } from 'react'
import type { ChatMessage } from '@/types'

export function ChatPanel({ messages, isSending, lastResolved, onSend }: {
  messages: ChatMessage[]
  isSending: boolean
  lastResolved: string[]
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0 && !isSending
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'}>
              <div className={m.role === 'user'
                ? 'rounded-2xl bg-teal-600 px-4 py-2 text-sm text-white'
                : 'rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-900'}>
                {m.content}
              </div>
            </div>
          ))}
          {lastResolved.length > 0 && (
            <div className="self-start max-w-[90%] rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
              {lastResolved.map((q, i) => <div key={i}>✓ Menutup pertanyaan: {q}</div>)}
            </div>
          )}
          {isSending && <div className="self-start text-xs text-gray-400">StoryForge sedang berpikir...</div>}
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-gray-300 bg-white p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) { onSend(text.trim()); setText('') } } }}
            placeholder="Tulis pesan, jawab pertanyaan, atau minta 'tulis PRD'..."
            rows={1}
            className="flex-1 resize-none bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={() => { if (canSend) { onSend(text.trim()); setText('') } }}
            disabled={!canSend}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/workspace/EmptyState.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**
```bash
git add components/analyze/workspace/EmptyState.tsx components/analyze/workspace/ChatPanel.tsx tests/components/workspace/EmptyState.test.ts
git commit -m "feat(workspace-ui): empty state + chat panel"
```

---

### Task F5: WorkspaceShell + flag-gated page

**Files:**
- Create: `components/analyze/workspace/WorkspaceShell.tsx`
- Create: `app/(app)/analyze/LegacyAnalyzeClient.tsx` (move existing body)
- Modify: `app/(app)/analyze/page.tsx` (thin flag wrapper)

- [ ] **Step 1: Move the existing page body into `LegacyAnalyzeClient.tsx`**

Cut the ENTIRE current contents of `app/(app)/analyze/page.tsx`, paste into a new file `app/(app)/analyze/LegacyAnalyzeClient.tsx`, and rename the default export:
```tsx
// app/(app)/analyze/LegacyAnalyzeClient.tsx
'use client'
// ...(all imports and code exactly as the old page)...
export function LegacyAnalyzeClient() {   // was: export default function AnalyzePage()
  // ...unchanged body...
}
```

- [ ] **Step 2: Implement WorkspaceShell** (ArtifactPanel is a stub until Task F6/F8; render a placeholder that is clearly visible — never blank)

```tsx
// components/analyze/workspace/WorkspaceShell.tsx
'use client'
import { useWorkspace } from '@/hooks/useWorkspace'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { ChatPanel } from './ChatPanel'
import { EmptyState } from './EmptyState'
import { ArtifactPanel } from './ArtifactPanel'

export function WorkspaceShell() {
  const ws = useWorkspace()
  const hasSession = !!ws.state && ws.state.messages.length > 0
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <WorkspaceSidebar activeSessionId={ws.sessionId} onNew={ws.startNewSession} onOpen={ws.loadSession} />
      <main id="main-content" className="flex min-w-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-r border-gray-200">
          {ws.error && (
            <div className="flex-shrink-0 bg-red-50 px-6 py-2 text-sm text-red-700">{ws.error}</div>
          )}
          {hasSession
            ? <ChatPanel messages={ws.state!.messages} isSending={ws.isSending} lastResolved={ws.lastResolved} onSend={ws.sendMessage} />
            : <EmptyState onSend={ws.sendMessage} isSending={ws.isSending} />}
        </section>
        {hasSession && (
          <aside className="hidden w-[42%] max-w-xl flex-shrink-0 flex-col overflow-y-auto bg-gray-50 lg:flex">
            <ArtifactPanel ws={ws} />
          </aside>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `page.tsx` as a flag wrapper** (keeps rules-of-hooks clean)

```tsx
// app/(app)/analyze/page.tsx
'use client'
import { WorkspaceShell } from '@/components/analyze/workspace/WorkspaceShell'
import { LegacyAnalyzeClient } from './LegacyAnalyzeClient'

export default function AnalyzePage() {
  if (process.env.NEXT_PUBLIC_LIVING_WORKSPACE === 'true') return <WorkspaceShell />
  return <LegacyAnalyzeClient />
}
```

- [ ] **Step 4: Build + manual run**

Run: `npx tsc --noEmit && npm run build && npm run dev`
Then open `/analyze` (flag on): the empty state shows; paste a short requirement; the chat reply appears and the artifact panel opens on the right. Flip the flag off and confirm the old page renders unchanged.
**Readability check:** confirm the "Analisis"/"Kirim" buttons, composer text, and sidebar are all visible (no element matching its background).

- [ ] **Step 5: Commit**
```bash
git add "app/(app)/analyze/page.tsx" "app/(app)/analyze/LegacyAnalyzeClient.tsx" components/analyze/workspace/WorkspaceShell.tsx
git commit -m "feat(workspace-ui): shell + flag-gated analyze page"
```

---

## Story 4 — Gaps & Score panel

### Task F6: GapsScorePanel + GapRow

**Files:**
- Create: `components/analyze/workspace/GapsScorePanel.tsx`
- Create: `components/analyze/workspace/GapRow.tsx`
- Test: `tests/components/workspace/GapsScorePanel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/workspace/GapsScorePanel.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GapsScorePanel } from '@/components/analyze/workspace/GapsScorePanel'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return { id: 'g1', category: 'functional', description: 'd', severity: 'high', question: 'Siapa approver?',
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null, ...p }
}
const noop = () => {}

describe('GapsScorePanel', () => {
  it('shows the score with a visible band color and the open question + actions', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({})], score: 85, label: 'Siap', onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('85')
    expect(html).toContain('text-teal-600')         // visible score color
    expect(html).toContain('Siapa approver?')
    expect(html).toContain('Di luar scope')          // dismiss action label
    expect(html).not.toMatch(/class="[^"]*bg-white[^"]*text-white/)
  })

  it('renders a constraint_conflict gap with its conflictsWith note', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({ category: 'constraint_conflict', conflictsWith: 'storage: S3', question: 'Pakai SFTP?' })],
      score: 85, label: 'Siap', onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('storage: S3')
  })

  it('shows resolved gaps as closed (answered)', () => {
    const html = renderToStaticMarkup(createElement(GapsScorePanel, {
      gaps: [gap({ status: 'answered', answer: 'Branch manager' })], score: 100, label: 'Siap', onAnswer: noop, onDismiss: noop,
    }))
    expect(html).toContain('Branch manager')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/workspace/GapsScorePanel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement GapRow**

```tsx
// components/analyze/workspace/GapRow.tsx
'use client'
import { useState } from 'react'
import type { WorkspaceGap } from '@/types/workspace'

const SEV: Record<WorkspaceGap['severity'], string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600',
}

export function GapRow({ gap, onAnswer, onDismiss }: {
  gap: WorkspaceGap
  onAnswer: (id: string, answer: string) => void
  onDismiss: (id: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const resolved = gap.status !== 'open'
  return (
    <div className={`rounded-xl border p-3 ${resolved ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm ${resolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{gap.question}</p>
        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs ${SEV[gap.severity]}`}>{gap.severity}</span>
      </div>
      {gap.category === 'constraint_conflict' && gap.conflictsWith && (
        <p className="mt-1 text-xs text-red-600">⚠ Bertentangan dengan: {gap.conflictsWith}</p>
      )}
      {resolved ? (
        <p className="mt-1 text-xs text-gray-500">
          {gap.status === 'out_of_scope' ? 'Di luar scope' : `Jawaban: ${gap.answer}`}
        </p>
      ) : (
        <div className="mt-2 flex items-end gap-2">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Jawab di sini..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            onClick={() => { if (answer.trim()) { onAnswer(gap.id, answer.trim()); setAnswer('') } }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >Jawab</button>
          <button
            onClick={() => onDismiss(gap.id)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >Di luar scope</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement GapsScorePanel**

```tsx
// components/analyze/workspace/GapsScorePanel.tsx
'use client'
import type { WorkspaceGap } from '@/types/workspace'
import { partitionGaps, scoreColor } from '@/lib/workspace/client-state'
import { GapRow } from './GapRow'

export function GapsScorePanel({ gaps, score, label, onAnswer, onDismiss }: {
  gaps: WorkspaceGap[]
  score: number
  label: string
  onAnswer: (id: string, answer: string) => void
  onDismiss: (id: string) => void
}) {
  const { open, resolved } = partitionGaps(gaps)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Readiness Score</p>
          <p className="text-sm text-gray-700">{label}</p>
        </div>
        <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
      </div>

      {open.length === 0 && resolved.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada gap. Tempel requirement di chat untuk mulai.</p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perlu dijawab ({open.length})</p>
          {open.map((g) => <GapRow key={g.id} gap={g} onAnswer={onAnswer} onDismiss={onDismiss} />)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sudah selesai ({resolved.length})</p>
          {resolved.map((g) => <GapRow key={g.id} gap={g} onAnswer={onAnswer} onDismiss={onDismiss} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/workspace/GapsScorePanel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**
```bash
git add components/analyze/workspace/GapsScorePanel.tsx components/analyze/workspace/GapRow.tsx tests/components/workspace/GapsScorePanel.test.ts
git commit -m "feat(workspace-ui): gaps & score panel"
```

---

## Story 5 — Chat ↔ panel sync (UI notices)

### Task F7: Verify closed-question notices end-to-end

> The data path is already built: the orchestrator returns `resolvedGapIds`; `useWorkspace` maps them to questions via `resolvedQuestions`; `ChatPanel` renders the teal notice block (Task F4). This task only verifies + adds a regression test on the mapping.

**Files:**
- Test: `tests/lib/client-state.test.ts` (extend)

- [ ] **Step 1: Add a focused regression test**

Append to `tests/lib/client-state.test.ts`:
```ts
import { resolvedQuestions as rq } from '@/lib/workspace/client-state'
describe('chat↔panel sync mapping', () => {
  it('only returns questions for the ids the server actually closed', () => {
    const gaps = [
      { id: 'a', question: 'Q-A' }, { id: 'b', question: 'Q-B' }, { id: 'c', question: 'Q-C' },
    ].map((g) => ({ ...g, category: 'functional', description: '', severity: 'low', status: 'open',
      answer: null, source: 'brd', conflictsWith: null, createdAt: '', resolvedAt: null })) as any
    expect(rq(gaps, ['a', 'c'])).toEqual(['Q-A', 'Q-C'])
    expect(rq(gaps, ['zzz'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run + manual verify**

Run: `npx vitest run tests/lib/client-state.test.ts` → PASS.
Manual (`npm run dev`, flag on): paste a requirement, then in chat type an answer to one of the questions. Expected: the chat shows a teal "✓ Menutup pertanyaan: …" notice and that gap moves to "Sudah selesai" in the panel with the score rising.

- [ ] **Step 3: Commit**
```bash
git add tests/lib/client-state.test.ts
git commit -m "test(workspace-ui): chat<->panel sync mapping"
```

---

## Story 6 — Living PRD artifact

### Task F8: ArtifactPanel (tabs) + PrdArtifact

**Files:**
- Create: `components/analyze/workspace/ArtifactPanel.tsx`
- Create: `components/analyze/workspace/PrdArtifact.tsx`
- Test: `tests/components/workspace/ArtifactPanel.test.ts`, `tests/components/workspace/PrdArtifact.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/components/workspace/PrdArtifact.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrdArtifact } from '@/components/analyze/workspace/PrdArtifact'
import type { PrdDraft } from '@/types/workspace'

const prd: PrdDraft = {
  markdown: '# Epic: Upload Dokumen\n- User story 1', openQuestions: ['Siapa approver?'],
  assumptions: ['Pakai S3'], version: 2, generatedAt: '2026-06-03',
}

describe('PrdArtifact', () => {
  it('renders the PRD content, open questions and assumptions', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd, onUpdate: () => {} }))
    expect(html).toContain('Upload Dokumen')
    expect(html).toContain('Siapa approver?')
    expect(html).toContain('Pakai S3')
    expect(html).toContain('v2')
  })
  it('renders an empty-PRD prompt with a visible generate button when prd is null', () => {
    const html = renderToStaticMarkup(createElement(PrdArtifact, { prd: null, onUpdate: () => {} }))
    expect(html).toContain('bg-teal-600')
    expect(html).toContain('text-white')
    expect(html.toLowerCase()).toContain('tulis prd')
  })
})
```

```ts
// tests/components/workspace/ArtifactPanel.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArtifactPanel } from '@/components/analyze/workspace/ArtifactPanel'

const wsBase = {
  state: { gaps: [], readinessScore: 100, readinessLabel: 'Siap', prd: null } as any,
  activeTab: 'gaps' as const, setActiveTab: () => {}, answerGap: () => {}, dismissGap: () => {}, generatePrd: () => {},
}

describe('ArtifactPanel', () => {
  it('marks the active tab distinctly from the inactive one (not color-only invisible)', () => {
    const html = renderToStaticMarkup(createElement(ArtifactPanel, { ws: wsBase as any }))
    expect(html).toContain('border-teal-600') // active tab underline
    expect(html).toContain('Gaps')
    expect(html).toContain('PRD')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/workspace/PrdArtifact.test.ts tests/components/workspace/ArtifactPanel.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement PrdArtifact**

```tsx
// components/analyze/workspace/PrdArtifact.tsx
'use client'
import type { PrdDraft } from '@/types/workspace'

export function PrdArtifact({ prd, onUpdate }: { prd: PrdDraft | null; onUpdate: () => void }) {
  if (!prd) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-gray-500">PRD belum dibuat. Tutup gap-nya dulu, atau minta StoryForge menulis PRD sekarang.</p>
        <button onClick={onUpdate} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Tulis PRD
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">v{prd.version}</span>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(prd.markdown)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Salin</button>
          <button onClick={onUpdate}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">Perbarui PRD</button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900">{prd.markdown}</pre>
      {prd.openQuestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Open Questions</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">{prd.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}
      {prd.assumptions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asumsi & Di luar scope</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">{prd.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement ArtifactPanel**

```tsx
// components/analyze/workspace/ArtifactPanel.tsx
'use client'
import type { UseWorkspace } from '@/hooks/useWorkspace'
import { GapsScorePanel } from './GapsScorePanel'
import { PrdArtifact } from './PrdArtifact'

export function ArtifactPanel({ ws }: { ws: UseWorkspace }) {
  if (!ws.state) return null
  const tabBase = 'px-4 py-2 text-sm font-medium border-b-2 -mb-px'
  const active = 'text-teal-700 border-teal-600'
  const inactive = 'text-gray-500 border-transparent hover:text-gray-700'
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white px-2">
        <button className={`${tabBase} ${ws.activeTab === 'gaps' ? active : inactive}`} onClick={() => ws.setActiveTab('gaps')}>Gaps & Score</button>
        <button className={`${tabBase} ${ws.activeTab === 'prd' ? active : inactive}`} onClick={() => ws.setActiveTab('prd')}>PRD</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {ws.activeTab === 'gaps'
          ? <GapsScorePanel gaps={ws.state.gaps} score={ws.state.readinessScore} label={ws.state.readinessLabel} onAnswer={ws.answerGap} onDismiss={ws.dismissGap} />
          : <PrdArtifact prd={ws.state.prd} onUpdate={ws.generatePrd} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/workspace/PrdArtifact.test.ts tests/components/workspace/ArtifactPanel.test.ts`
Expected: PASS.

- [ ] **Step 6: Manual verify** (`npm run dev`, flag on): paste requirement → "Gaps & Score" tab populated → type "tulis PRD" → panel auto-switches to PRD tab, content shows, Open Questions present; close a gap then "Perbarui PRD" → version bumps and Open Questions shrink. Confirm both tabs and all buttons are readable.

- [ ] **Step 7: Commit**
```bash
git add components/analyze/workspace/ArtifactPanel.tsx components/analyze/workspace/PrdArtifact.tsx tests/components/workspace/ArtifactPanel.test.ts tests/components/workspace/PrdArtifact.test.ts
git commit -m "feat(workspace-ui): artifact tabs + living PRD"
```

---

## Story 7 — Sidebar, resume & migration

### Task F9: WorkspaceSidebar (New analysis + Recents + resume)

**Files:**
- Create: `components/analyze/workspace/WorkspaceSidebar.tsx`
- Test: `tests/components/workspace/WorkspaceSidebar.test.ts`

- [ ] **Step 1: Write the failing test** (render with injected sessions to avoid network)

```ts
// tests/components/workspace/WorkspaceSidebar.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SidebarView } from '@/components/analyze/workspace/WorkspaceSidebar'

describe('SidebarView', () => {
  const sessions = [{ session_id: 's1', title: 'Upload Dokumen', last_active_at: '2026-06-03', readiness_score: 85 }]
  const html = renderToStaticMarkup(createElement(SidebarView, {
    sessions, activeSessionId: 's1', onNew: () => {}, onOpen: () => {},
  }))
  it('renders New analysis with a visible label on the dark sidebar', () => {
    expect(html).toContain('Analisis Baru')
    expect(html).toContain('bg-gray-950')   // dark sidebar
    expect(html).toContain('text-gray')     // light/grey text on dark — never text-gray-950 here
    expect(html).not.toContain('text-gray-950')
  })
  it('lists recent sessions by title', () => {
    expect(html).toContain('Upload Dokumen')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/workspace/WorkspaceSidebar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (split into a pure `SidebarView` + a data-loading wrapper)

```tsx
// components/analyze/workspace/WorkspaceSidebar.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SessionRow { session_id: string; title: string | null; last_active_at: string | null; readiness_score: number | null }

export function SidebarView({ sessions, activeSessionId, onNew, onOpen }: {
  sessions: SessionRow[]
  activeSessionId: string
  onNew: () => void
  onOpen: (sessionId: string) => void
}) {
  return (
    <aside className="hidden h-screen w-60 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-950 lg:flex">
      <div className="px-3 py-4">
        <button onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <span className="text-lg leading-none">＋</span> Analisis Baru
        </button>
      </div>
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Terbaru</p>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && <p className="px-3 py-2 text-xs text-gray-600">Belum ada sesi</p>}
        {sessions.map((s) => (
          <button key={s.session_id} onClick={() => onOpen(s.session_id)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              s.session_id === activeSessionId ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
            {s.title || 'Sesi tanpa judul'}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export function WorkspaceSidebar({ activeSessionId, onNew, onOpen }: {
  activeSessionId: string; onNew: () => void; onOpen: (sessionId: string) => void
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase.from('analysis_results')
      .select('session_id, title, last_active_at, readiness_score')
      .order('last_active_at', { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setSessions(data as SessionRow[]) })
  }, [activeSessionId])
  return <SidebarView sessions={sessions} activeSessionId={activeSessionId} onNew={onNew} onOpen={onOpen} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/workspace/WorkspaceSidebar.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Manual verify resume** (`npm run dev`, flag on): create a session, send a couple messages, click "Analisis Baru", then click the previous session in the sidebar → full state restores (chat + gaps + score + PRD). Confirm legacy rows (created via the old flow) also open and render (gaps derived as open).

- [ ] **Step 6: Commit**
```bash
git add components/analyze/workspace/WorkspaceSidebar.tsx tests/components/workspace/WorkspaceSidebar.test.ts
git commit -m "feat(workspace-ui): sidebar with recents + resume"
```

---

### Task F10: Flag-flip cleanup (remove dead sample/legacy)

> Run ONLY when ready to make the living workspace the default for everyone. Until then, leave the flag wrapper in place.

**Files:**
- Delete: `components/analyze/SampleBRD.tsx`
- Modify: `lib/constants.ts` (remove `SAMPLE_BRD`), `app/(app)/analyze/LegacyAnalyzeClient.tsx` + `page.tsx`

- [ ] **Step 1: Confirm no remaining live references to the legacy flow**

Run: `grep -rn "SAMPLE_BRD\|SampleBRD\|LegacyAnalyzeClient" app components lib`
Expected: matches only in the legacy files about to be removed.

- [ ] **Step 2: Delete the sample + legacy page; make WorkspaceShell the page**

Replace `app/(app)/analyze/page.tsx` with a direct render of `WorkspaceShell` (drop the flag check), delete `LegacyAnalyzeClient.tsx` and `components/analyze/SampleBRD.tsx`, and remove the `SAMPLE_BRD` export from `lib/constants.ts`.

```tsx
// app/(app)/analyze/page.tsx
'use client'
import { WorkspaceShell } from '@/components/analyze/workspace/WorkspaceShell'
export default function AnalyzePage() { return <WorkspaceShell /> }
```

- [ ] **Step 3: Build + lint**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean, no unresolved `SAMPLE_BRD`/`SampleBRD` references.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore(workspace-ui): flag-flip — remove sample BRD + legacy analyze path"
```

---

## Frontend Definition of Done

- [ ] All FE unit suites pass: `npm test` (client-state, EmptyState, GapsScorePanel, ArtifactPanel, PrdArtifact, WorkspaceSidebar).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.
- [ ] **No-sample check:** `EmptyState` has no sample button and no `SAMPLE_BRD`/`SampleBRD` import (asserted by test + grep).
- [ ] **Contrast check:** every component test asserts the visible class combo; a manual `npm run dev` pass confirms no button or text disappears into its background, in both the dark sidebar and the light chat/artifact panels.
- [ ] Full happy path (flag on): empty state → paste BRD → gaps + score appear → answer in panel AND in chat (notice shows, gap closes, score rises) → dismiss one as out-of-scope → "tulis PRD" → PRD tab with Open Questions + Assumptions → close more → "Perbarui PRD" → version bumps, Open Questions shrink → "Analisis Baru" then reopen previous session → state restored.
- [ ] Legacy session opens and renders in the workspace (resume + `rowToState` fallback).
- [ ] Old `/analyze` unchanged while flag is off (until Task F10).
- [ ] Session log written to `obsidian-vault/03-Sessions/` and `00-Index.md` updated (per CLAUDE.md).
```
