# Living BRD Workspace — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-shot `/analyze` phase machine with a Claude-style living workspace — chat + a persistent Gaps & Score panel + a living PRD artifact — backed by a mutable session that never maxes out on context and is aware of a user/project context layer.

**Architecture:** One Next.js route (`/api/workspace`) is the orchestrator. Each turn it loads the living-session row → builds a compact model payload (context layer + canonical state + rolling summary + last K messages) → calls Anthropic (`@/lib/anthropic`) → parses a single structured JSON (`ModelTurnResponse`) → applies it to `WorkspaceState` via a pure reducer → persists. The frontend is a 3-zone shell (sidebar · chat · artifact panel) driven by a `useWorkspace` hook over SSE. All new behaviour is gated behind `NEXT_PUBLIC_LIVING_WORKSPACE`; the old page stays intact until the flag flips.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Tailwind, Supabase (Postgres + RLS), Anthropic SDK via `@/lib/anthropic`, SSE via `@/lib/sse`, Vitest (+ fast-check) for tests.

**Spec:** `obsidian-vault/01-Product/Epic-Living-BRD-Workspace.md` (Stories 1–7 = Phase 1).

---

## A. Build order & dependency graph (read first)

Strict task order. Each story is independently testable; later stories consume earlier seams, never the reverse.

```
Story 1  Data model + orchestrator  ──► provides: WorkspaceState, ModelTurnResponse,
  (BE foundation, no deps)                reducer, store(+legacy fallback), score,
        │                                 context-builder, prompts, /api/workspace,
        │                                 migration 010
        ├──► Story 2  Context layer (BE)  — fills the empty `contextBlock` seam from Story 1.
        │            provides: user_context table, /api/user-context, context-loader,
        │            Settings UI. Constraint-conflict gaps are just gaps (no new code).
        │
        └──► Story 3  Chat shell (FE)  — consumes /api/workspace via useWorkspace hook.
                   │
                   ├──► Story 4  Gaps & Score panel (FE)  — renders WorkspaceState.gaps + score;
                   │            panel-side Answer/Dismiss via PATCH /api/workspace/gap.
                   │
                   ├──► Story 5  Chat↔panel sync (FE+prompt)  — uses reducer.resolvedGapIds
                   │            (already in Story 1) + closed-question notices in chat.
                   │
                   ├──► Story 6  Living PRD artifact (FE)  — renders WorkspaceState.prd;
                   │            "command" intent (Story 1 prompt) produces/updates prd.
                   │
                   └──► Story 7  Sidebar + resume + migration (FE)  — opens any row via
                                rowToState (legacy fallback already in Story 1's store).
```

**Dependency-proofing decisions (made now to avoid rework):**

1. **Context seam in Story 1.** `buildWorkspaceSystemPrompt({ contextBlock, state })` accepts `contextBlock` (defaults to `''`). Story 2 only supplies a non-empty string + one wiring line in the route. No core route changes in Story 2.
2. **Legacy fallback in Story 1's store.** `rowToState(row)` already derives `gaps`/`prd`/`title` from legacy columns when the new columns are empty. Story 7 (resume/migration) consumes it with zero new mapping logic.
3. **Single model contract.** `ModelTurnResponse` (defined in Story 1) is the only shape every later story depends on. Constraint-conflict gaps, chat-sync resolutions, and PRD are all fields of this one object — no schema drift between stories.
4. **PRD via `command` intent, not a separate route.** Folding PRD generation into the orchestrator removes a route + a state-sync path. Story 6 is therefore FE-only.
5. **No token streaming in v1.** Orchestrator emits `status` events then one `done` with `{ assistantMessage, state }`. Eliminates the "stream prose + trailing JSON" parser entirely. (Token streaming = future enhancement.)
6. **`summarized_up_to` column added in migration 010**, so compaction never needs a later migration.

**Deviations from the epic (intentional, noted here):** PRD handled inline by `command` intent (epic listed `/api/workspace/prd/route.ts` — not built); PRD `version` lives inside the `prd` JSONB (epic listed a separate `prd_version` column — not added). Everything else matches.

---

## B. Full file map (all Phase-1 stories)

**Backend / shared (Stories 1–2):**
- Create `types/workspace.ts` — `WorkspaceGap`, `GapStatus`, `GapCategory`, `PrdDraft`, `WorkspaceIntent`, `WorkspaceState`, `ModelTurnResponse`, `UserContext`.
- Create `lib/analysis/workspace-score.ts` — `computeWorkspaceScore(gaps)` → 0-100 (label applied via existing `getScoreLabel`).
- Create `lib/analysis/workspace-reducer.ts` — `applyTurn(state, res, now)` pure reducer.
- Create `lib/analysis/workspace-store.ts` — `rowToState(row)` (+legacy fallback), `stateToRow(state, userId, projectId)`, `legacyGaps(row)`.
- Create `lib/analysis/workspace-context.ts` — `buildModelPayload(state, contextBlock)`, `needsCompaction(state)`, `compactionSlice(state)`, `applyCompaction(state, summary)`.
- Create `lib/prompts/workspace.ts` — `buildWorkspaceSystemPrompt({contextBlock,state})`, `buildSummaryPrompt(messages)`.
- Create `lib/analysis/context-loader.ts` — `loadContextLayers(supabase, userId, projectId)` → context block string.
- Create `app/api/workspace/route.ts` — orchestrator (POST).
- Create `app/api/workspace/gap/route.ts` — panel-side Answer/Dismiss (PATCH).
- Create `app/api/user-context/route.ts` — GET/PUT user context.
- Create `supabase/migrations/010_living_workspace.sql`, `supabase/migrations/011_user_context.sql`.
- Modify `app/(app)/settings/page.tsx` — add "Konteks & Memori" section.

**Frontend (Stories 3–7):**
- Create `hooks/useWorkspace.ts` — session state + `sendMessage`, `answerGap`, `dismissGap`, `generatePrd`.
- Create `components/analyze/workspace/WorkspaceShell.tsx` — 3-zone layout.
- Create `components/analyze/workspace/WorkspaceSidebar.tsx` — New analysis + Recents (+ Search/Starred slots).
- Create `components/analyze/workspace/ChatPanel.tsx` — messages + composer + closed-question notices.
- Create `components/analyze/workspace/ArtifactPanel.tsx` — tabbed container.
- Create `components/analyze/workspace/GapsScorePanel.tsx`, `GapRow.tsx` — gaps + live score.
- Create `components/analyze/workspace/PrdArtifact.tsx` — living PRD.
- Create `components/analyze/workspace/EmptyState.tsx` — fresh-session composer.
- Modify `app/(app)/analyze/page.tsx` — flag-gated branch into `WorkspaceShell`.

**Tests (vitest, `tests/` mirrors source path):**
- `tests/lib/workspace-score.test.ts`, `tests/lib/workspace-reducer.test.ts`, `tests/lib/workspace-store.test.ts`, `tests/lib/workspace-context.test.ts`, `tests/lib/context-loader.test.ts`, `tests/hooks/useWorkspace.test.ts`, `tests/components/workspace/GapsScorePanel.test.tsx`.

---

## C. Shared contract (defined in Task 1, referenced everywhere)

`ModelTurnResponse` is the exact JSON the model returns each turn. The route parses it; `applyTurn` consumes it. Every later story reads `WorkspaceState`.

```ts
// types/workspace.ts
import type { ChatMessage } from './index'

export type GapStatus = 'open' | 'answered' | 'out_of_scope'
export type GapCategory =
  | 'business' | 'functional' | 'non_functional'
  | 'role' | 'edge_case' | 'constraint_conflict'

export interface WorkspaceGap {
  id: string
  category: GapCategory
  description: string
  severity: 'high' | 'medium' | 'low'
  question: string
  status: GapStatus
  answer: string | null
  source: 'brd' | 'chat'
  conflictsWith: string | null   // set when category === 'constraint_conflict'
  createdAt: string
  resolvedAt: string | null
}

export interface PrdDraft {
  markdown: string
  openQuestions: string[]
  assumptions: string[]
  version: number
  generatedAt: string
}

export type WorkspaceIntent =
  | 'new_or_expanded_requirement'
  | 'answer_pending_question'
  | 'command'
  | 'general_chat'

export interface WorkspaceState {
  sessionId: string
  title: string
  brdText: string                // canonical original requirement (satisfies brd_text NOT NULL; never overwritten on resume)
  gaps: WorkspaceGap[]
  readinessScore: number
  readinessLabel: string
  prd: PrdDraft | null
  messages: ChatMessage[]
  contextSummary: string
  summarizedUpTo: number
  lastActiveAt: string
}

export interface ModelTurnResponse {
  intent: WorkspaceIntent
  assistantMessage: string
  newGaps: Array<{
    category: GapCategory
    description: string
    severity: 'high' | 'medium' | 'low'
    question: string
    source: 'brd' | 'chat'
    conflictsWith?: string | null
  }>
  resolvedGapIds: string[]
  gapAnswers: Record<string, string>
  outOfScopeGapIds: string[]
  prd: { markdown: string; openQuestions: string[]; assumptions: string[] } | null
}

export interface UserContext {
  industry: string
  role: string
  compliance: string[]
  techDefaults: Record<string, string>   // e.g. { storage: 'S3', backend: 'Supabase' }
  standingInstructions: string
  prdTemplate: string
}
```

---

## D. Setup Task

### Task 0: Branch + flag

**Files:** none (git + env)

- [ ] **Step 1: Create the working branch from main**

Run:
```bash
git checkout main && git pull && git checkout -b feat/living-brd-workspace
```
Expected: switched to a new branch `feat/living-brd-workspace`.

- [ ] **Step 2: Add the feature flag to the env example**

Add to `.env.local` (and document in `.env.example` if present):
```
NEXT_PUBLIC_LIVING_WORKSPACE=true
```

- [ ] **Step 3: Commit**

```bash
git add .env.example 2>/dev/null; git commit --allow-empty -m "chore: start living-workspace branch + flag" 
```

---

## Story 1 — Living-session data model + orchestrator API

### Task 1: Shared types

**Files:**
- Create: `types/workspace.ts` (full content in section C above)

- [ ] **Step 1: Create `types/workspace.ts`** with the exact content from section C.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `types/workspace.ts`.

- [ ] **Step 3: Commit**
```bash
git add types/workspace.ts && git commit -m "feat(workspace): shared types and model contract"
```

---

### Task 2: Workspace score

**Files:**
- Create: `lib/analysis/workspace-score.ts`
- Test: `tests/lib/workspace-score.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/workspace-score.test.ts
import { describe, it, expect } from 'vitest'
import { computeWorkspaceScore } from '@/lib/analysis/workspace-score'
import type { WorkspaceGap } from '@/types/workspace'

function gap(p: Partial<WorkspaceGap>): WorkspaceGap {
  return {
    id: 'x', category: 'functional', description: '', severity: 'medium',
    question: 'q', status: 'open', answer: null, source: 'brd',
    conflictsWith: null, createdAt: '', resolvedAt: null, ...p,
  }
}

describe('computeWorkspaceScore', () => {
  it('is 100 when there are no gaps', () => {
    expect(computeWorkspaceScore([])).toBe(100)
  })
  it('penalises open gaps by severity', () => {
    expect(computeWorkspaceScore([gap({ severity: 'high' })])).toBe(85)
    expect(computeWorkspaceScore([gap({ severity: 'medium' })])).toBe(92)
    expect(computeWorkspaceScore([gap({ severity: 'low' })])).toBe(97)
  })
  it('ignores answered and out_of_scope gaps', () => {
    expect(computeWorkspaceScore([
      gap({ severity: 'high', status: 'answered' }),
      gap({ severity: 'high', status: 'out_of_scope' }),
    ])).toBe(100)
  })
  it('floors at 0', () => {
    const many = Array.from({ length: 10 }, () => gap({ severity: 'high' }))
    expect(computeWorkspaceScore(many)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/workspace-score.test.ts`
Expected: FAIL — cannot find module `workspace-score`.

- [ ] **Step 3: Write implementation**

```ts
// lib/analysis/workspace-score.ts
import type { WorkspaceGap } from '@/types/workspace'

const SEVERITY_PENALTY = { high: 15, medium: 8, low: 3 } as const

/** Score = 100 minus penalties for OPEN gaps only. Resolved gaps carry no penalty. */
export function computeWorkspaceScore(gaps: WorkspaceGap[]): number {
  const penalty = gaps
    .filter((g) => g.status === 'open')
    .reduce((sum, g) => sum + SEVERITY_PENALTY[g.severity], 0)
  return Math.max(0, Math.min(100, 100 - penalty))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/workspace-score.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/analysis/workspace-score.ts tests/lib/workspace-score.test.ts
git commit -m "feat(workspace): severity-based readiness score"
```

---

### Task 3: Turn reducer

**Files:**
- Create: `lib/analysis/workspace-reducer.ts`
- Test: `tests/lib/workspace-reducer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/workspace-reducer.test.ts
import { describe, it, expect } from 'vitest'
import { applyTurn } from '@/lib/analysis/workspace-reducer'
import type { WorkspaceState, ModelTurnResponse, WorkspaceGap } from '@/types/workspace'

const NOW = '2026-06-03T00:00:00.000Z'

function baseState(gaps: WorkspaceGap[] = []): WorkspaceState {
  return {
    sessionId: 's1', title: 't', brdText: 'b', gaps, readinessScore: 100, readinessLabel: 'Siap',
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: NOW,
  }
}
function openGap(id: string, severity: WorkspaceGap['severity'] = 'high'): WorkspaceGap {
  return { id, category: 'functional', description: 'd', severity, question: `q-${id}`,
    status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: NOW, resolvedAt: null }
}
function emptyRes(p: Partial<ModelTurnResponse> = {}): ModelTurnResponse {
  return { intent: 'general_chat', assistantMessage: 'ok', newGaps: [], resolvedGapIds: [],
    gapAnswers: {}, outOfScopeGapIds: [], prd: null, ...p }
}

describe('applyTurn', () => {
  it('adds new gaps with generated ids and recomputes score', () => {
    const next = applyTurn(baseState(), emptyRes({
      intent: 'new_or_expanded_requirement',
      newGaps: [{ category: 'edge_case', description: 'd', severity: 'high', question: 'Apa yang terjadi saat offline?', source: 'brd' }],
    }), NOW)
    expect(next.gaps).toHaveLength(1)
    expect(next.gaps[0].id).toBeTruthy()
    expect(next.gaps[0].status).toBe('open')
    expect(next.readinessScore).toBe(85)
    expect(next.readinessLabel).toBe('Siap')
  })

  it('does not add a duplicate gap (same question, case-insensitive)', () => {
    const s = baseState([openGap('g1')])
    s.gaps[0].question = 'Siapa approver?'
    const next = applyTurn(s, emptyRes({
      newGaps: [{ category: 'role', description: 'd', severity: 'high', question: 'siapa approver?', source: 'chat' }],
    }), NOW)
    expect(next.gaps).toHaveLength(1)
  })

  it('marks resolved gaps answered with their answer and raises the score', () => {
    const next = applyTurn(baseState([openGap('g1')]), emptyRes({
      intent: 'answer_pending_question',
      resolvedGapIds: ['g1'], gapAnswers: { g1: 'Branch manager' },
    }), NOW)
    expect(next.gaps[0].status).toBe('answered')
    expect(next.gaps[0].answer).toBe('Branch manager')
    expect(next.gaps[0].resolvedAt).toBe(NOW)
    expect(next.readinessScore).toBe(100)
  })

  it('marks out-of-scope gaps and raises the score', () => {
    const next = applyTurn(baseState([openGap('g1')]), emptyRes({ outOfScopeGapIds: ['g1'] }), NOW)
    expect(next.gaps[0].status).toBe('out_of_scope')
    expect(next.readinessScore).toBe(100)
  })

  it('stores a constraint_conflict gap with conflictsWith', () => {
    const next = applyTurn(baseState(), emptyRes({
      newGaps: [{ category: 'constraint_conflict', description: 'pakai SFTP', severity: 'high',
        question: 'Requirement pakai SFTP, padahal default S3 — sengaja?', source: 'brd', conflictsWith: 'storage: S3' }],
    }), NOW)
    expect(next.gaps[0].category).toBe('constraint_conflict')
    expect(next.gaps[0].conflictsWith).toBe('storage: S3')
  })

  it('creates/updates the PRD and bumps version when prd is present', () => {
    const next = applyTurn(baseState(), emptyRes({
      intent: 'command',
      prd: { markdown: '# PRD', openQuestions: ['Q1'], assumptions: ['A1'] },
    }), NOW)
    expect(next.prd?.version).toBe(1)
    expect(next.prd?.markdown).toBe('# PRD')
    const again = applyTurn(next, emptyRes({ intent: 'command', prd: { markdown: '# PRD v2', openQuestions: [], assumptions: [] } }), NOW)
    expect(again.prd?.version).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/workspace-reducer.test.ts`
Expected: FAIL — cannot find module `workspace-reducer`.

- [ ] **Step 3: Write implementation**

```ts
// lib/analysis/workspace-reducer.ts
import { randomUUID } from 'crypto'
import { computeWorkspaceScore } from './workspace-score'
import { getScoreLabel } from './score-utils'
import type { WorkspaceState, ModelTurnResponse, WorkspaceGap } from '@/types/workspace'

/** Pure reducer: apply one model turn to the workspace state. Never mutates inputs. */
export function applyTurn(state: WorkspaceState, res: ModelTurnResponse, now: string): WorkspaceState {
  let gaps: WorkspaceGap[] = state.gaps.map((g) => {
    if (res.resolvedGapIds.includes(g.id) && g.status === 'open') {
      return { ...g, status: 'answered', answer: res.gapAnswers[g.id] ?? g.answer ?? '', resolvedAt: now }
    }
    if (res.outOfScopeGapIds.includes(g.id) && g.status === 'open') {
      return { ...g, status: 'out_of_scope', resolvedAt: now }
    }
    return g
  })

  const seen = new Set(gaps.map((g) => g.question.trim().toLowerCase()))
  for (const ng of res.newGaps) {
    const key = ng.question.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    gaps.push({
      id: randomUUID(),
      category: ng.category,
      description: ng.description,
      severity: ng.severity,
      question: ng.question,
      status: 'open',
      answer: null,
      source: ng.source,
      conflictsWith: ng.conflictsWith ?? null,
      createdAt: now,
      resolvedAt: null,
    })
  }

  const prd = res.prd
    ? {
        markdown: res.prd.markdown,
        openQuestions: res.prd.openQuestions,
        assumptions: res.prd.assumptions,
        version: (state.prd?.version ?? 0) + 1,
        generatedAt: now,
      }
    : state.prd

  const score = computeWorkspaceScore(gaps)
  return {
    ...state,
    gaps,
    prd,
    readinessScore: score,
    readinessLabel: getScoreLabel(score),
    lastActiveAt: now,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/workspace-reducer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/analysis/workspace-reducer.ts tests/lib/workspace-reducer.test.ts
git commit -m "feat(workspace): pure turn reducer"
```

---

### Task 4: Compaction + payload builder

**Files:**
- Create: `lib/analysis/workspace-context.ts`
- Test: `tests/lib/workspace-context.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/workspace-context.test.ts
import { describe, it, expect } from 'vitest'
import { needsCompaction, compactionSlice, applyCompaction, buildModelPayload } from '@/lib/analysis/workspace-context'
import type { WorkspaceState } from '@/types/workspace'

const KEEP = 12
function state(n: number): WorkspaceState {
  return {
    sessionId: 's', title: 't', brdText: '', gaps: [], readinessScore: 100, readinessLabel: 'Siap',
    prd: null, contextSummary: '', summarizedUpTo: 0, lastActiveAt: '',
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` } as const)),
  }
}

describe('compaction', () => {
  it('does not compact under the keep-verbatim threshold', () => {
    expect(needsCompaction(state(KEEP))).toBe(false)
  })
  it('compacts when verbatim messages exceed the threshold', () => {
    expect(needsCompaction(state(KEEP + 4))).toBe(true)
    expect(compactionSlice(state(KEEP + 4)).map(m => m.content)).toEqual(['m0', 'm1', 'm2', 'm3'])
  })
  it('applyCompaction appends summary and advances summarizedUpTo', () => {
    const s = applyCompaction(state(KEEP + 4), 'ringkasan lama')
    expect(s.summarizedUpTo).toBe(4)
    expect(s.contextSummary).toContain('ringkasan lama')
  })
  it('buildModelPayload sends only summary + verbatim tail and never loses gaps', () => {
    const s = applyCompaction(state(KEEP + 4), 'ringkasan')
    const payload = buildModelPayload(s, '')
    expect(payload.messages).toHaveLength(KEEP)        // only the tail
    expect(payload.messages[0].content).toBe('m4')
    expect(payload.system).toContain('ringkasan')
  })
  it('buildModelPayload injects a non-empty context block at the top', () => {
    const payload = buildModelPayload(state(2), 'KONTEKS USER: fintech')
    expect(payload.system.indexOf('KONTEKS USER: fintech')).toBeLessThan(payload.system.indexOf('STATE'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/workspace-context.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// lib/analysis/workspace-context.ts
import type { WorkspaceState } from '@/types/workspace'
import type { ChatMessage } from '@/types'
import { buildWorkspaceSystemPrompt } from '@/lib/prompts/workspace'

export const KEEP_VERBATIM = 12

/** True when more than KEEP_VERBATIM un-summarised messages exist. */
export function needsCompaction(state: WorkspaceState, keep = KEEP_VERBATIM): boolean {
  return state.messages.length - state.summarizedUpTo > keep
}

/** The oldest un-summarised messages that should be folded into the summary. */
export function compactionSlice(state: WorkspaceState, keep = KEEP_VERBATIM): ChatMessage[] {
  const end = state.messages.length - keep
  return state.messages.slice(state.summarizedUpTo, end)
}

/** Fold `summary` into contextSummary and advance the summarised pointer. Pure. */
export function applyCompaction(state: WorkspaceState, summary: string, keep = KEEP_VERBATIM): WorkspaceState {
  const end = state.messages.length - keep
  const merged = state.contextSummary ? `${state.contextSummary}\n${summary}` : summary
  return { ...state, contextSummary: merged, summarizedUpTo: Math.max(state.summarizedUpTo, end) }
}

/** Build the bounded Anthropic payload: system (context + canonical state + summary) + verbatim tail. */
export function buildModelPayload(state: WorkspaceState, contextBlock: string): {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
} {
  const tail = state.messages.slice(state.summarizedUpTo)
  return {
    system: buildWorkspaceSystemPrompt({ contextBlock, state }),
    messages: tail.map((m) => ({ role: m.role, content: m.content })),
  }
}
```

- [ ] **Step 4: Run test to verify it passes** (Task 5 supplies `buildWorkspaceSystemPrompt`; if running this task in isolation, implement Task 5 first — they are a pair. The test asserts `system` contains the summary and `STATE` marker, both produced by Task 5's prompt.)

Run: `npx vitest run tests/lib/workspace-context.test.ts`
Expected: PASS (5 tests) once Task 5 exists.

- [ ] **Step 5: Commit**
```bash
git add lib/analysis/workspace-context.ts tests/lib/workspace-context.test.ts
git commit -m "feat(workspace): context compaction + bounded payload builder"
```

---

### Task 5: Prompts

**Files:**
- Create: `lib/prompts/workspace.ts`

> No standalone unit test (prompt is a string template; behaviour is covered by Task 4's payload test + manual route verification in Task 9). Keep it pure and deterministic.

- [ ] **Step 1: Implement the prompt builders**

```ts
// lib/prompts/workspace.ts
import type { WorkspaceState } from '@/types/workspace'
import type { ChatMessage } from '@/types'

function renderGaps(state: WorkspaceState): string {
  const open = state.gaps.filter((g) => g.status === 'open')
  if (open.length === 0) return '(tidak ada gap terbuka)'
  return open.map((g) => `  - id=${g.id} [${g.severity}] (${g.category}) ${g.question}`).join('\n')
}

/**
 * System prompt for one orchestrator turn. The model MUST return ONE JSON object
 * matching ModelTurnResponse — no markdown, no code fence.
 * `contextBlock` is prepended verbatim (empty in Story 1, filled by Story 2).
 */
export function buildWorkspaceSystemPrompt({ contextBlock, state }: { contextBlock: string; state: WorkspaceState }): string {
  const ctx = contextBlock.trim() ? `${contextBlock.trim()}\n\n` : ''
  const summary = state.contextSummary.trim() ? `RINGKASAN PERCAKAPAN SEBELUMNYA:\n${state.contextSummary.trim()}\n\n` : ''

  return `${ctx}Kamu adalah analis requirements senior yang membantu seorang Product Manager mengubah requirement yang berantakan menjadi PRD yang siap dikerjakan. Bahasa: Indonesia yang natural.

${summary}STATE SAAT INI:
- Readiness score: ${state.readinessScore}/100 (${state.readinessLabel})
- Gap TERBUKA (gunakan id persis saat menutupnya):
${renderGaps(state)}
- PRD: ${state.prd ? `sudah ada, versi ${state.prd.version}` : 'belum dibuat'}

TUGAS: klasifikasikan pesan terakhir user ke SATU intent, lalu lakukan aksinya:
1. "new_or_expanded_requirement" — user menempel/menambah requirement. Temukan gap baru (maks 6 per turn). JANGAN bertanya hal yang sudah dijawab oleh KONTEKS di atas. Jika requirement BERTENTANGAN dengan konteks (mis. pakai SFTP padahal default S3, atau melanggar regulasi yang disebut), buat gap dengan category "constraint_conflict" dan isi conflictsWith.
2. "answer_pending_question" — pesan user menjawab satu/lebih gap terbuka. Isi resolvedGapIds (pakai id dari daftar di atas) + gapAnswers. Jika jawaban ambigu/parsial, JANGAN tutup; ajukan follow-up sebagai newGaps.
3. "command" — user minta menulis/memperbarui/menfinalkan PRD ("tulis PRD", "update PRD", "finalkan"). Hasilkan field prd: markdown PRD lengkap (epic + user story INVEST + acceptance criteria Gherkin). Jika ada "TEMPLATE PRD" di KONTEKS, IKUTI strukturnya; jika tidak, pakai format default. Pertanyaan yang masih terbuka MASUK ke prd.openQuestions; gap out_of_scope MASUK ke prd.assumptions.
4. "general_chat" — selain di atas. Balas saja; jangan ubah gap/PRD.

assistantMessage WAJIB: balasan natural ke user yang menjelaskan apa yang kamu lakukan (gap baru, gap yang ditutup, atau jawaban langsung).

KEMBALIKAN HANYA JSON valid (tanpa markdown, tanpa code block) dengan bentuk PERSIS:
{"intent":"...","assistantMessage":"...","newGaps":[{"category":"functional","description":"...","severity":"high","question":"...","source":"brd","conflictsWith":null}],"resolvedGapIds":[],"gapAnswers":{},"outOfScopeGapIds":[],"prd":null}`
}

/** Cheap prompt to summarise old chat turns during compaction. */
export function buildSummaryPrompt(messages: ChatMessage[]): string {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'PM' : 'AI'}: ${m.content}`).join('\n')
  return `Ringkas percakapan berikut menjadi 4-6 poin penting (keputusan, jawaban, dan konteks yang sudah ditetapkan). Bahasa Indonesia, padat, tanpa basa-basi.\n\n${transcript}`
}
```

- [ ] **Step 2: Typecheck + run the Task-4 suite now that the prompt exists**

Run: `npx vitest run tests/lib/workspace-context.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**
```bash
git add lib/prompts/workspace.ts && git commit -m "feat(workspace): orchestrator + summary prompts"
```

---

### Task 6: Migration 010 (living-session columns)

**Files:**
- Create: `supabase/migrations/010_living_workspace.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: living_workspace
-- Evolves analysis_results into a living-session record. All columns nullable/defaulted (non-breaking).
ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS gaps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prd JSONB,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS context_summary TEXT DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS summarized_up_to INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flow_chart TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_results_last_active
  ON analysis_results(user_id, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_results_starred
  ON analysis_results(user_id, starred) WHERE starred = true;

-- Living sessions use status = 'active'; widen the existing CHECK (added in migration 005).
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_status_check;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_status_check
  CHECK (status IN ('finalizing', 'done', 'archived', 'active'));

COMMENT ON COLUMN analysis_results.gaps IS 'WorkspaceGap[] — structured living gap list (supersedes gap_list + clarification_questions)';
COMMENT ON COLUMN analysis_results.prd IS 'PrdDraft — living PRD (markdown + openQuestions + assumptions + version)';
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` tool (name `living_workspace`, body = the SQL above), OR locally: `supabase db push`.
Expected: success; columns visible via `list_tables`.

- [ ] **Step 3: Verify an existing row is unaffected**

Run a `SELECT id, gaps, last_active_at FROM analysis_results LIMIT 1;` (via Supabase MCP `execute_sql`).
Expected: existing row returns `gaps = []`, a non-null `last_active_at`.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/010_living_workspace.sql
git commit -m "feat(workspace): migration 010 living-session columns"
```

---

### Task 7: Store (row ⇄ state, with legacy fallback)

**Files:**
- Create: `lib/analysis/workspace-store.ts`
- Test: `tests/lib/workspace-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/workspace-store.test.ts
import { describe, it, expect } from 'vitest'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'

describe('rowToState', () => {
  it('reads new-format columns directly', () => {
    const row = {
      session_id: 's1', title: 'Judul', gaps: [{ id: 'g1', category: 'functional', description: 'd',
        severity: 'high', question: 'q', status: 'open', answer: null, source: 'brd',
        conflictsWith: null, createdAt: 'x', resolvedAt: null }],
      prd: null, messages: [{ role: 'user', content: 'hi' }], readiness_score: 85, readiness_label: 'Siap',
      context_summary: '', summarized_up_to: 0, last_active_at: 'now',
    }
    const s = rowToState(row)
    expect(s.title).toBe('Judul')
    expect(s.gaps).toHaveLength(1)
    expect(s.readinessScore).toBe(85)
  })

  it('falls back to legacy gap_list + clarification_questions when gaps is empty', () => {
    const row = {
      session_id: 's2', title: null, gaps: [], prd: null, messages: [],
      gap_list: [{ category: 'Role Definition', description: 'Approver tak jelas', severity: 'high' }],
      clarification_questions: ['Siapa approver?'],
      requirements: null, brd_text: 'Judul BRD\nbaris kedua',
      readiness_score: 50, readiness_label: 'Perlu Klarifikasi', last_active_at: 'now',
    }
    const s = rowToState(row)
    expect(s.gaps.length).toBeGreaterThanOrEqual(2) // 1 from clarification + 1 from gap_list
    expect(s.gaps.every(g => g.status === 'open')).toBe(true)
    expect(s.title).toBe('Judul BRD')               // derived from brd_text first line
  })
})

describe('stateToRow', () => {
  it('maps state back to column names', () => {
    const row = stateToRow({
      sessionId: 's1', title: 't', brdText: 'Requirement asli', gaps: [], readinessScore: 90, readinessLabel: 'Siap',
      prd: null, messages: [], contextSummary: 'sum', summarizedUpTo: 2, lastActiveAt: 'now',
    }, 'user-1', 'proj-1')
    expect(row.session_id).toBe('s1')
    expect(row.user_id).toBe('user-1')
    expect(row.project_id).toBe('proj-1')
    expect(row.brd_text).toBe('Requirement asli')   // NOT NULL column satisfied
    expect(row.readiness_score).toBe(90)
    expect(row.summarized_up_to).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/workspace-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// lib/analysis/workspace-store.ts
import { randomUUID } from 'crypto'
import { getScoreLabel } from './score-utils'
import { computeWorkspaceScore } from './workspace-score'
import type { WorkspaceState, WorkspaceGap, PrdDraft } from '@/types/workspace'
import type { ChatMessage } from '@/types'

type Row = Record<string, unknown>

function deriveTitle(row: Row): string {
  if (typeof row.title === 'string' && row.title.trim()) return row.title.trim()
  const brd = typeof row.brd_text === 'string' ? row.brd_text : ''
  const first = brd.split('\n')[0].replace(/^#+\s*/, '').trim()
  return first.slice(0, 60) || 'Sesi tanpa judul'
}

/** Build WorkspaceGap[] from legacy gap_list + clarification_questions. */
export function legacyGaps(row: Row): WorkspaceGap[] {
  const out: WorkspaceGap[] = []
  const now = new Date().toISOString()
  const questions = Array.isArray(row.clarification_questions) ? row.clarification_questions as string[] : []
  for (const q of questions) {
    out.push({ id: randomUUID(), category: 'functional', description: q, severity: 'medium',
      question: q, status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: now, resolvedAt: null })
  }
  const list = Array.isArray(row.gap_list) ? row.gap_list as { category: string; description: string; severity: WorkspaceGap['severity'] }[] : []
  const seen = new Set(out.map((g) => g.question.trim().toLowerCase()))
  for (const g of list) {
    const question = g.description
    if (seen.has(question.trim().toLowerCase())) continue
    out.push({ id: randomUUID(), category: 'functional', description: g.description, severity: g.severity ?? 'medium',
      question, status: 'open', answer: null, source: 'brd', conflictsWith: null, createdAt: now, resolvedAt: null })
  }
  return out
}

export function rowToState(row: Row): WorkspaceState {
  const gaps = Array.isArray(row.gaps) && (row.gaps as unknown[]).length > 0
    ? (row.gaps as WorkspaceGap[])
    : legacyGaps(row)

  const prd = (row.prd ?? null) as PrdDraft | null
  const score = typeof row.readiness_score === 'number' ? row.readiness_score : computeWorkspaceScore(gaps)

  return {
    sessionId: String(row.session_id),
    title: deriveTitle(row),
    brdText: (row.brd_text as string) ?? '',
    gaps,
    readinessScore: score,
    readinessLabel: (row.readiness_label as string) ?? getScoreLabel(score),
    prd,
    messages: (Array.isArray(row.messages) ? row.messages : []) as ChatMessage[],
    contextSummary: (row.context_summary as string) ?? '',
    summarizedUpTo: (row.summarized_up_to as number) ?? 0,
    lastActiveAt: (row.last_active_at as string) ?? new Date().toISOString(),
  }
}

/** Map state → analysis_results columns for upsert (onConflict: session_id). */
export function stateToRow(state: WorkspaceState, userId: string, projectId: string | null): Row {
  return {
    user_id: userId,
    session_id: state.sessionId,
    project_id: projectId,
    title: state.title,
    brd_text: state.brdText || state.title || 'Requirement',  // brd_text is NOT NULL
    gaps: state.gaps,
    prd: state.prd,
    messages: state.messages,
    readiness_score: state.readinessScore,
    readiness_label: state.readinessLabel,
    context_summary: state.contextSummary,
    summarized_up_to: state.summarizedUpTo,
    last_active_at: state.lastActiveAt,
    status: 'active',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/workspace-store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/analysis/workspace-store.ts tests/lib/workspace-store.test.ts
git commit -m "feat(workspace): row<->state store with legacy fallback"
```

---

### Task 8: Orchestrator route `/api/workspace`

**Files:**
- Create: `app/api/workspace/route.ts`

> Route logic is integration-level; covered by manual verification (Task 9). Pure helpers it depends on are already unit-tested. Mirror the streaming pattern from `app/api/refine/route.ts`.

- [ ] **Step 1: Implement the route**

```ts
// app/api/workspace/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { sseEvent, createSSEStream } from '@/lib/sse'
import { getModelConfig } from '@/lib/model-selector'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'
import { applyTurn } from '@/lib/analysis/workspace-reducer'
import {
  buildModelPayload, needsCompaction, compactionSlice, applyCompaction,
} from '@/lib/analysis/workspace-context'
import { buildSummaryPrompt } from '@/lib/prompts/workspace'
import { loadContextLayers } from '@/lib/analysis/context-loader' // Story 2; returns '' until then
import { getScoreLabel } from '@/lib/analysis/score-utils'
import type { WorkspaceState, ModelTurnResponse } from '@/types/workspace'
import type { ChatMessage } from '@/types'

export const runtime = 'nodejs'
const MAX_MESSAGE_CHARS = 150_000

function stripFence(t: string): string {
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function newState(sessionId: string, title: string, brdText: string): WorkspaceState {
  return {
    sessionId, title, brdText, gaps: [], readinessScore: 100, readinessLabel: getScoreLabel(100),
    prd: null, messages: [], contextSummary: '', summarizedUpTo: 0, lastActiveAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown; message?: unknown; projectId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null
  const message = typeof body.message === 'string' ? body.message.slice(0, MAX_MESSAGE_CHARS) : null
  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : null
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  // Load or create the living session.
  const { data: row } = await supabase
    .from('analysis_results').select('*').eq('session_id', sessionId).eq('user_id', user.id).single()
  const derivedTitle = message.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) || 'Sesi baru'
  let state: WorkspaceState = row ? rowToState(row) : newState(sessionId, derivedTitle, message)

  // Append the user's message.
  const userMsg: ChatMessage = { role: 'user', content: message }
  state = { ...state, messages: [...state.messages, userMsg] }

  const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
  const plan = (sub?.plan as 'free' | 'pro') || 'free'
  const modelConfig = getModelConfig(plan)
  const contextBlock = await loadContextLayers(supabase, user.id, projectId)

  const { readable, enqueue, close, error: streamError } = createSSEStream()
  const headers = new Headers({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })

  ;(async () => {
    try {
      enqueue(sseEvent('status', { message: 'Menganalisis...' }))

      // 1. Compact if the verbatim tail is too long (cheap summary call).
      if (needsCompaction(state)) {
        const slice = compactionSlice(state)
        const sum = await anthropic.messages.create({
          model: modelConfig.model, max_tokens: 512, temperature: 0,
          messages: [{ role: 'user', content: buildSummaryPrompt(slice) }],
        })
        const summaryText = sum.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim()
        state = applyCompaction(state, summaryText)
      }

      // 2. Main turn.
      const payload = buildModelPayload(state, contextBlock)
      const completion = await anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: plan === 'pro' ? 8192 : 6144,
        temperature: 0,
        system: payload.system,
        messages: payload.messages,
      })
      const raw = completion.content.map((c) => (c.type === 'text' ? c.text : '')).join('')

      let parsed: ModelTurnResponse
      try { parsed = JSON.parse(stripFence(raw)) } catch {
        console.error('[api/workspace] JSON parse failed:', raw.slice(0, 300))
        streamError('Terjadi kesalahan. Coba lagi.'); return
      }

      // 3. Apply + append assistant message + persist. (applyTurn already rescores authoritatively.)
      const now = new Date().toISOString()
      state = applyTurn(state, parsed, now)
      state = { ...state, messages: [...state.messages, { role: 'assistant', content: parsed.assistantMessage }] }

      const { error: upErr } = await supabase
        .from('analysis_results').upsert(stateToRow(state, user.id, projectId), { onConflict: 'session_id' })
      if (upErr) { console.error('[api/workspace] upsert failed:', upErr); streamError('Gagal menyimpan. Coba lagi.'); return }

      enqueue(sseEvent('done', {
        assistantMessage: parsed.assistantMessage,
        intent: parsed.intent,
        resolvedGapIds: parsed.resolvedGapIds,
        state,
      }))
      close()
    } catch (err) {
      console.error('[api/workspace] error:', err)
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers })
}
```

- [ ] **Step 2: Typecheck + lint (incl. the anthropic-import guard)**

Run: `npx tsc --noEmit && npm run lint && npm run lint:anthropic`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add app/api/workspace/route.ts && git commit -m "feat(workspace): orchestrator route /api/workspace"
```

---

### Task 9: Manual verification of the orchestrator

**Files:** none (smoke test)

- [ ] **Step 1: Run the app and authenticate**

Run: `npm run dev` — log in at `http://localhost:3000/login` in the browser, then copy the Supabase auth cookie for curl, OR drive the next step from the browser devtools console while logged in (`fetch('/api/workspace', {...})`).

- [ ] **Step 2: First turn — paste a requirement**

In the browser console (logged in):
```js
const r = await fetch('/api/workspace', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ sessionId: crypto.randomUUID(), message: 'PM bisa upload dokumen lewat SFTP ke server cabang.' }) })
console.log(await r.text())
```
Expected: SSE text containing `event: status` then `event: done` whose `state.gaps` is non-empty and `state.readinessScore < 100`.

- [ ] **Step 3: Second turn — answer & command (reuse the same sessionId)**

Send `message: 'tulis PRD'` with the same `sessionId`.
Expected: `done` event with `state.prd.markdown` populated and `state.prd.version === 1`.

- [ ] **Step 4: Verify persistence**

Via Supabase MCP `execute_sql`: `SELECT gaps, prd, summarized_up_to FROM analysis_results WHERE session_id = '<id>';`
Expected: `gaps` and `prd` JSON match what the API returned.

- [ ] **Step 5: Commit a short verification note**
```bash
git commit --allow-empty -m "test(workspace): manual orchestrator smoke verified"
```

---

## Story 2 — Context layer + constraint-aware gaps

### Task 10: Migration 011 (user_context)

**Files:**
- Create: `supabase/migrations/011_user_context.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: user_context — per-user global memory read before every analysis.
CREATE TABLE IF NOT EXISTS user_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  industry TEXT DEFAULT '',
  role TEXT DEFAULT '',
  compliance TEXT[] DEFAULT '{}',
  tech_defaults JSONB DEFAULT '{}'::jsonb,
  standing_instructions TEXT DEFAULT '',
  prd_template TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own context select" ON user_context FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own context insert" ON user_context FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own context update" ON user_context FOR UPDATE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply** via Supabase MCP `apply_migration` (name `user_context`). Verify with `list_tables` that `user_context` exists with RLS enabled.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/011_user_context.sql && git commit -m "feat(context): migration 011 user_context table"
```

---

### Task 11: Context loader

**Files:**
- Create: `lib/analysis/context-loader.ts`
- Test: `tests/lib/context-loader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/context-loader.test.ts
import { describe, it, expect } from 'vitest'
import { formatContextBlock } from '@/lib/analysis/context-loader'

describe('formatContextBlock', () => {
  it('returns empty string when nothing is set', () => {
    expect(formatContextBlock(null, null)).toBe('')
  })
  it('includes industry, compliance, tech defaults and PRD template', () => {
    const block = formatContextBlock({
      industry: 'fintech', role: 'PM', compliance: ['OJK'],
      techDefaults: { storage: 'S3' }, standingInstructions: 'Selalu pakai Bahasa Indonesia.', prdTemplate: 'PAKAI TEMPLATE X',
    }, null)
    expect(block).toContain('fintech')
    expect(block).toContain('OJK')
    expect(block).toContain('storage: S3')
    expect(block).toContain('PAKAI TEMPLATE X')
    expect(block).toContain('Selalu pakai Bahasa Indonesia.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/context-loader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// lib/analysis/context-loader.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserContext } from '@/types/workspace'
import type { ProjectContext } from '@/types'

/** Pure formatter — turns the merged context into the prompt-prepended block. */
export function formatContextBlock(uc: UserContext | null, project: { name: string; context: ProjectContext } | null): string {
  const lines: string[] = []
  if (uc) {
    if (uc.industry) lines.push(`Industri: ${uc.industry}`)
    if (uc.role) lines.push(`Peran user: ${uc.role}`)
    if (uc.compliance.length) lines.push(`Regulasi/compliance yang berlaku: ${uc.compliance.join(', ')}`)
    const td = Object.entries(uc.techDefaults || {})
    if (td.length) lines.push(`Default teknis: ${td.map(([k, v]) => `${k}: ${v}`).join(', ')}`)
    if (uc.standingInstructions) lines.push(`Instruksi tetap dari user: ${uc.standingInstructions}`)
    if (uc.prdTemplate) lines.push(`TEMPLATE PRD yang HARUS diikuti saat menulis PRD:\n${uc.prdTemplate}`)
  }
  if (project) {
    lines.push(`\nKONTEKS PROJECT: ${project.name}`)
    if (project.context.business?.domain) lines.push(`Domain: ${project.context.business.domain}`)
    if (project.context.business?.compliance?.length) lines.push(`Compliance project: ${project.context.business.compliance.join(', ')}`)
    if (project.context.technical?.backend) lines.push(`Backend: ${project.context.technical.backend}`)
    if (project.context.technical?.constraints?.length) lines.push(`Batasan teknis: ${project.context.technical.constraints.join(', ')}`)
  }
  if (lines.length === 0) return ''
  return `KONTEKS YANG SUDAH DIKETAHUI (baca dulu — jangan tanyakan hal yang sudah dijawab di sini; tandai pelanggaran/kontradiksi sebagai gap constraint_conflict):\n${lines.join('\n')}`
}

/** Load user + project context and return the formatted block ('' when none). */
export async function loadContextLayers(
  supabase: SupabaseClient, userId: string, projectId: string | null,
): Promise<string> {
  const { data: ucRow } = await supabase
    .from('user_context')
    .select('industry, role, compliance, tech_defaults, standing_instructions, prd_template')
    .eq('user_id', userId).single()

  const uc: UserContext | null = ucRow ? {
    industry: ucRow.industry ?? '', role: ucRow.role ?? '',
    compliance: (ucRow.compliance ?? []) as string[],
    techDefaults: (ucRow.tech_defaults ?? {}) as Record<string, string>,
    standingInstructions: ucRow.standing_instructions ?? '', prdTemplate: ucRow.prd_template ?? '',
  } : null

  let project: { name: string; context: ProjectContext } | null = null
  if (projectId) {
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', userId).single()
    if ((sub?.plan as string) === 'pro') {
      const { data: p } = await supabase.from('projects').select('name, context').eq('id', projectId).single()
      if (p) project = { name: p.name as string, context: p.context as ProjectContext }
    }
  }
  return formatContextBlock(uc, project)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/context-loader.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/analysis/context-loader.ts tests/lib/context-loader.test.ts
git commit -m "feat(context): loader + prompt block formatter"
```

---

### Task 12: User-context API

**Files:**
- Create: `app/api/user-context/route.ts`

- [ ] **Step 1: Implement GET + PUT**

```ts
// app/api/user-context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('user_context').select('*').eq('user_id', user.id).single()
  return NextResponse.json({ context: data ?? null })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let b: Record<string, unknown>
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const row = {
    user_id: user.id,
    industry: String(b.industry ?? '').slice(0, 200),
    role: String(b.role ?? '').slice(0, 200),
    compliance: Array.isArray(b.compliance) ? (b.compliance as unknown[]).map(String).slice(0, 20) : [],
    tech_defaults: (b.techDefaults && typeof b.techDefaults === 'object') ? b.techDefaults : {},
    standing_instructions: String(b.standingInstructions ?? '').slice(0, 4000),
    prd_template: String(b.prdTemplate ?? '').slice(0, 8000),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('user_context').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add app/api/user-context/route.ts && git commit -m "feat(context): user-context GET/PUT API"
```

---

### Task 13: Settings UI — "Konteks & Memori"

**Files:**
- Modify: `app/(app)/settings/page.tsx` (add a section above "Keamanan")

- [ ] **Step 1: Add context state + load/save, and render the section**

Insert this self-contained block as a new `<section>` at the top of `<main>` in `settings/page.tsx` (after `<h1>`). It is independent of the existing logout/deletion state.

```tsx
// --- add near the other useState hooks ---
const [ctx, setCtx] = useState({ industry: '', role: '', compliance: '', techDefaults: '', standingInstructions: '', prdTemplate: '' })
const [ctxSaved, setCtxSaved] = useState(false)
const [ctxSaving, setCtxSaving] = useState(false)

useEffect(() => {
  fetch('/api/user-context').then(r => r.json()).then(({ context }) => {
    if (context) setCtx({
      industry: context.industry ?? '', role: context.role ?? '',
      compliance: (context.compliance ?? []).join(', '),
      techDefaults: Object.entries(context.tech_defaults ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
      standingInstructions: context.standing_instructions ?? '', prdTemplate: context.prd_template ?? '',
    })
  }).catch(() => {})
}, [])

async function saveContext(e: React.FormEvent) {
  e.preventDefault(); setCtxSaving(true); setCtxSaved(false)
  const techDefaults: Record<string, string> = {}
  for (const line of ctx.techDefaults.split('\n')) {
    const [k, ...rest] = line.split(':'); if (k.trim() && rest.length) techDefaults[k.trim()] = rest.join(':').trim()
  }
  const res = await fetch('/api/user-context', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ industry: ctx.industry, role: ctx.role,
      compliance: ctx.compliance.split(',').map(s => s.trim()).filter(Boolean),
      techDefaults, standingInstructions: ctx.standingInstructions, prdTemplate: ctx.prdTemplate }) })
  setCtxSaving(false); if (res.ok) setCtxSaved(true)
}
```

```tsx
{/* --- render: place right after <h1> --- */}
<section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900 mb-1">Konteks & Memori</h2>
  <p className="text-sm text-gray-500 mb-4">Dibaca AI sebelum menganalisis setiap requirement — agar pertanyaannya relevan dan kontradiksi (mis. SFTP vs S3, pelanggaran OJK) langsung ditandai.</p>
  <form onSubmit={saveContext} className="flex flex-col gap-4">
    <label className="text-sm font-medium text-gray-700">Industri
      <input value={ctx.industry} onChange={e => setCtx({ ...ctx, industry: e.target.value })} placeholder="mis. fintech"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
    <label className="text-sm font-medium text-gray-700">Peran kamu
      <input value={ctx.role} onChange={e => setCtx({ ...ctx, role: e.target.value })} placeholder="mis. Product Manager"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
    <label className="text-sm font-medium text-gray-700">Regulasi / compliance (pisahkan dengan koma)
      <input value={ctx.compliance} onChange={e => setCtx({ ...ctx, compliance: e.target.value })} placeholder="OJK, PDP"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
    <label className="text-sm font-medium text-gray-700">Default teknis (satu per baris, format key: value)
      <textarea value={ctx.techDefaults} onChange={e => setCtx({ ...ctx, techDefaults: e.target.value })} rows={3} placeholder={"storage: S3\nbackend: Supabase"}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" /></label>
    <label className="text-sm font-medium text-gray-700">Instruksi tetap untuk AI
      <textarea value={ctx.standingInstructions} onChange={e => setCtx({ ...ctx, standingInstructions: e.target.value })} rows={3} placeholder="mis. Selalu jawab dalam Bahasa Indonesia. Hindari jargon."
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
    <label className="text-sm font-medium text-gray-700">Template PRD (opsional — kosongkan untuk format default)
      <textarea value={ctx.prdTemplate} onChange={e => setCtx({ ...ctx, prdTemplate: e.target.value })} rows={4} placeholder="Tempel struktur PRD pilihanmu di sini."
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" /></label>
    <div className="flex items-center gap-3">
      <button type="submit" disabled={ctxSaving} className="self-start rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60">
        {ctxSaving ? 'Menyimpan...' : 'Simpan Konteks'}</button>
      {ctxSaved && <span className="text-sm text-teal-600">Tersimpan ✓</span>}
    </div>
  </form>
</section>
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build.

- [ ] **Step 3: Manual check** — `npm run dev`, open `/settings`, fill fintech + `storage: S3`, save, reload → values persist.

- [ ] **Step 4: Commit**
```bash
git add "app/(app)/settings/page.tsx" && git commit -m "feat(context): Konteks & Memori settings section"
```

---

### Task 14: Constraint-aware verification (context end-to-end)

**Files:** none (smoke test — the prompt + loader are already wired via Task 8's `loadContextLayers` call)

- [ ] **Step 1: With a fintech + `storage: S3` profile saved**, start a new workspace turn (browser console, logged in):
```js
await fetch('/api/workspace', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ sessionId: crypto.randomUUID(), message: 'User mengirim file lewat SFTP ke server.' }) }).then(r=>r.text()).then(console.log)
```
Expected: `done.state.gaps` contains a gap with `category: 'constraint_conflict'` and a populated `conflictsWith`, and there is **no** "industri apa?" question.

- [ ] **Step 2: Empty-profile regression** — delete the `user_context` row, repeat with a generic requirement.
Expected: still returns normal gaps (no crash) — graceful degradation confirmed.

- [ ] **Step 3: Commit**
```bash
git commit --allow-empty -m "test(context): constraint-conflict + empty-profile verified"
```

---

## Story 3–7 — Frontend living workspace

> These build on the now-complete BE. They are **FE-only** (plus the chat-sync prompt behaviour already shipped in Task 5). Detailed task-by-task code for Stories 3–7 is in the companion plan **`2026-06-03-living-brd-workspace-phase1-frontend.md`** (write next). The contracts they consume are frozen above: `WorkspaceState`, the `/api/workspace` `done` payload `{ assistantMessage, intent, resolvedGapIds, state }`, `PATCH /api/workspace/gap`, and `rowToState` for resume.

**Frozen FE↔BE contract (so the FE plan cannot drift):**

| FE need | BE source | Shape |
|---|---|---|
| Send chat / paste BRD | `POST /api/workspace` | `{ sessionId, message, projectId? }` → SSE `status`, then `done: { assistantMessage, intent, resolvedGapIds, state: WorkspaceState }` |
| Answer a gap from the panel | `PATCH /api/workspace/gap` (Task 15) | `{ sessionId, gapId, answer }` → `{ state }` |
| Dismiss a gap (out of scope) | `PATCH /api/workspace/gap` | `{ sessionId, gapId, outOfScope: true }` → `{ state }` |
| Generate/update PRD | `POST /api/workspace` | `{ sessionId, message: 'tulis PRD' }` (command intent) |
| List recents | Supabase select on `analysis_results` | order by `last_active_at desc` |
| Resume a session | `rowToState(row)` | `WorkspaceState` |

**FE UX constraints (MANDATORY — these are acceptance criteria for every Story 3–7 task):**

1. **No sample/example BRD.** The new empty-state composer (`EmptyState.tsx`) must NOT include a "Sample BRD" / "Coba contoh" button, and must NOT import `SAMPLE_BRD` or `components/analyze/SampleBRD.tsx`. The empty state is just a welcoming prompt + the composer. (The old `BRDInput` keeps `onSample` but it is gated off behind `NEXT_PUBLIC_LIVING_WORKSPACE`.)
2. **No invisible elements — enforce contrast.** Every interactive element (buttons, tab labels, send button, gap status badges, chips) and every text block MUST have a visible foreground/background contrast. Concretely:
   - No element may use the same color token for its text/icon as its own background (e.g. never `text-white` on `bg-white`, never `text-gray-950` on `bg-gray-950`).
   - Primary actions use a filled style: `bg-teal-600 text-white` (hover `bg-teal-700`). Secondary/ghost buttons use `text-gray-700` on `bg-white`/`bg-gray-50` with a visible `border-gray-300`.
   - Disabled buttons keep a visible label (use `disabled:opacity-60`, never `opacity-0` or matching text-to-bg).
   - Active vs inactive artifact tabs must be visually distinct (active: `text-teal-700 border-b-2 border-teal-600`; inactive: `text-gray-500`), not differentiated by color alone where it drops below contrast.
   - The chat composer textarea, the send button, and gap Answer/Dismiss controls must each be visible against the panel they sit in (dark sidebar `bg-gray-950` → light text; light panels `bg-white` → dark text).
   - **Verification per FE task:** after building each component, run it (`npm run dev` or Playwright screenshot) and confirm every button and text label is readable — no element that disappears into its background. Add this check to each FE task's DoD.

### Task 15: Panel-side gap mutation route (needed by Story 4 — define now to freeze the contract)

**Files:**
- Create: `app/api/workspace/gap/route.ts`

- [ ] **Step 1: Implement PATCH (no model call — pure state mutation + rescore)**

```ts
// app/api/workspace/gap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rowToState, stateToRow } from '@/lib/analysis/workspace-store'
import { computeWorkspaceScore } from '@/lib/analysis/workspace-score'
import { getScoreLabel } from '@/lib/analysis/score-utils'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let b: { sessionId?: string; gapId?: string; answer?: string; outOfScope?: boolean }
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!b.sessionId || !b.gapId) return NextResponse.json({ error: 'Missing sessionId/gapId' }, { status: 400 })

  const { data: row } = await supabase.from('analysis_results').select('*')
    .eq('session_id', b.sessionId).eq('user_id', user.id).single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date().toISOString()
  const state = rowToState(row)
  const gaps = state.gaps.map((g) => g.id !== b.gapId || g.status !== 'open' ? g
    : b.outOfScope ? { ...g, status: 'out_of_scope' as const, resolvedAt: now }
    : { ...g, status: 'answered' as const, answer: (b.answer ?? '').trim(), resolvedAt: now })
  const score = computeWorkspaceScore(gaps)
  const next = { ...state, gaps, readinessScore: score, readinessLabel: getScoreLabel(score), lastActiveAt: now }

  const { error } = await supabase.from('analysis_results').upsert(stateToRow(next, user.id, row.project_id as string | null), { onConflict: 'session_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ state: next })
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint && npm run lint:anthropic`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add app/api/workspace/gap/route.ts && git commit -m "feat(workspace): panel gap answer/dismiss route"
```

---

## E. Phase-1 Definition of Done (this plan)

- [ ] All unit suites pass: `npm test` (workspace-score, workspace-reducer, workspace-context, workspace-store, context-loader).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run lint:anthropic`, `npm run build` all clean.
- [ ] Migrations 010 + 011 applied; an existing `analysis_results` row still loads (legacy fallback) and a new living session round-trips (gaps + prd persisted and reloadable).
- [ ] Orchestrator happy path verified (Task 9): paste → gaps + score < 100 → "tulis PRD" → `prd.version === 1`.
- [ ] Context verified (Task 14): fintech + S3 profile → SFTP requirement yields a `constraint_conflict` gap and no "what industry?" question; empty profile still works.
- [ ] All model calls go through `@/lib/anthropic` (guard passes); `ANTHROPIC_API_KEY` never reaches the client.
- [ ] Backend is flag-independent and inert until the FE (Stories 3–7) wires it behind `NEXT_PUBLIC_LIVING_WORKSPACE`; old `/analyze` untouched.

## F. Next plan

Stories 3–7 (chat shell, Gaps & Score panel, chat↔panel sync UI, living PRD artifact, sidebar + resume + migration) → `docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1-frontend.md`. The FE↔BE contract in section D + Task 15 is frozen, so the FE plan consumes it without backend changes.
