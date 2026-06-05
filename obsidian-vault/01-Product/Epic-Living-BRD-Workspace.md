---
title: "Epic — Living BRD Workspace (Analyze Page Revamp)"
status: Approved for build
owner: Adi (solo)
created: 2026-06-03
branch: feat/living-brd-workspace (to be created)
related: [[PRD-v1.5]], [[00-Index]]
---

# Epic — Living BRD Workspace

> **One-line:** Replace the one-shot "paste BRD → analyze → finalize" page with a Claude-style **living workspace** where a PM chats with the AI, gaps + clarifying questions + readiness score persist in a side panel, and a PRD artifact is written on demand — all in a session that **never maxes out on context**.

---

## 1. Problem

The current `/analyze` page (`app/(app)/analyze/page.tsx`) is a rigid phase machine: `input → analyzing → refining → finalizing → done`. Pain points:

1. **Feels like AI-slop / form-first.** You paste into a big textarea, get a result, finalize once. It does not feel like a workspace.
2. **One-shot PRD.** The PRD (requirements) is generated only at `finalize`. You can't keep a living document that updates as you iterate.
3. **No persistence of the thinking.** Gaps/questions/score are transient UI state, not a durable workspace you return to.
4. **Context maxes out.** (The #1 reason this beats raw Claude.) In Claude chat you must open a new session when context fills. A PM loses the thread. We need a session that auto-compacts so it **never** maxes out.
5. **No organization.** Sidebar is a flat 20-item history list — no search, no starred, no project grouping.

## 2. Who it's for

The product owner (Adi), solo. Real workflow this epic must accelerate:

1. Paste a BRD/requirement, ask AI to analyze →
2. AI returns gaps + clarifying questions →
3. Answer what's known; defer the rest to BE/users (mark out-of-scope / leave open) →
4. Iterate; some questions close, new ones may appear →
5. Ask AI to write the **PRD (epic + user stories + AC)** — even with some open questions left (they become a PRD section) →
6–10. Downstream: groom to dev/designer, designer drafts, dev builds, BE updates FSD, build prototype. **(Out of scope for this epic — the PRD is the handoff artifact that feeds these, via existing skills: designer-handoff, fsd-generator, boss-prototype-builder.)**
11. Context maxes out → **need a persistent workspace.** ✅ Core to this epic.

## 3. The model (approved)

- **One session = one living requirement.** Long-lived and mutable; you return and keep iterating, never "locked/finished." A genuinely new requirement = a new session (one click), grouped under a Project, findable via search/starred.
- **Three zones (Claude-style):**
  - **Left sidebar** — New analysis · Recents · Search · Starred · Projects.
  - **Center chat** — free conversation + AI replies + inline "I closed question X" notices.
  - **Right artifact panel** — tabs: **Gaps & Score** · **PRD** · (phase 2) **Flowchart**.
- **Gaps & Score panel** — persistent. Each clarifying question can be **Answered** or **Dismissed as out-of-scope**. Both close the gap and raise the score; out-of-scope items are recorded and surface in the PRD's "Assumptions & Out of Scope" section. New gaps can appear as the conversation evolves.
- **PRD artifact** — written when **all gaps close** OR when **you explicitly ask**. Open questions become an "Open Questions" section. The PRD re-syncs on request as gaps later close.
- **Context-aware from the first question** — before analyzing, the AI reads a context layer (your profile/standing rules → project memory → the requirement). It skips questions already answered by what it knows, and **flags contradictions** with known context (e.g. requirement says SFTP but your tech default is S3; or an OJK-regulated flow that looks non-compliant).
- **Never maxes out** — the orchestrator keeps a compact canonical state (gap list + answers + PRD draft + rolling chat summary) and sends only that to the model, not the full raw history.

## 4. Scope

**In (Phase 1):** living-session data model + orchestrator API with intent routing + auto-compaction; **context layer** (user profile + project memory injected first, constraint-aware gaps, PRD-format preference); chat-first shell; Gaps & Score panel; chat↔panel sync; living PRD artifact; sidebar + resume + migration behind a feature flag.

**In (Phase 2):** Flowchart tab; session search; starred sessions; Projects + Company Context in sidebar.

**Out:** Downstream grooming, designer handoff, FSD, prototype (existing skills). Payment/tier changes. Multi-user/team. Multiple requirements in one session.

## 5. Architecture (Approach A — approved)

### 5.1 Data model

Evolve `analysis_results` (the living-session record). New migration `supabase/migrations/010_living_workspace.sql`, all columns nullable/defaulted (non-breaking):

| Column | Type | Purpose |
|---|---|---|
| `gaps` | `JSONB` | Structured gap list (see shape below). Supersedes the parallel `gap_list` + `clarification_questions` going forward; keep old columns for back-compat / migration. |
| `prd` | `JSONB` | `{ markdown, userStories, openQuestions, version, generatedAt }`. `userStories` reuses existing `UserStory` type. |
| `prd_version` | `INTEGER DEFAULT 0` | Bumped each PRD regenerate/re-sync. |
| `title` | `TEXT` | Session title (auto-derived from first message; editable later). |
| `starred` | `BOOLEAN DEFAULT false` | Phase 2 starred. |
| `context_summary` | `TEXT` | Rolling compaction summary of older chat turns. |
| `flow_chart` | `TEXT` | Phase 2 — Mermaid source. |
| `last_active_at` | `TIMESTAMPTZ DEFAULT now()` | Sidebar ordering + resume. |

**Gap object shape** (TS type to add in `types/index.ts`, e.g. `WorkspaceGap`):

```ts
type GapStatus = 'open' | 'answered' | 'out_of_scope'
interface WorkspaceGap {
  id: string                 // stable uuid
  category: string           // e.g. 'business', 'functional', 'edge_case', or 'constraint_conflict'
  description: string
  severity: 'high' | 'medium' | 'low'
  question: string           // the clarifying question shown in the panel
  status: GapStatus
  answer: string | null      // present when status === 'answered'
  source: 'brd' | 'chat'     // where the gap was discovered
  conflictsWith: string | null  // set when category === 'constraint_conflict' — the known fact it contradicts
  createdAt: string
  resolvedAt: string | null
}
```

Status enum on the session: a living session is `status = 'active'`. Keep `finalizing`/`done` for migrated rows.

### 5.2 Orchestrator API

Single endpoint `POST /api/workspace` (consolidates today's `/api/analyze` + `/api/refine`; `/api/requirements` becomes the PRD-generation path invoked by the orchestrator or a sibling route `/api/workspace/prd`). SSE-streamed like the existing routes (`lib/sse-client.ts`, `readSSEStream`).

**Request:** `{ sessionId, message }` (message optional on first turn when seeding from a pasted BRD).

**Flow per turn:**
1. Load session state from `analysis_results`.
2. **Build compact context:** the **context layer** (§5.5: user profile + project memory, read first) + canonical state (full `gaps` + `prd` summary) + `context_summary` + last K verbatim messages. Never send full raw history.
3. Call Anthropic (`claude-haiku-4-5`, server-side only — per CLAUDE.md). System prompt instructs the model to **classify intent** and return a structured action plus an assistant message (streamed text + a trailing JSON block, or tool/structured output).
4. Apply the action to state, persist, stream assistant message, return updated canonical state in the `done` event.

**Four intents** (routing table):

| Intent | Trigger | Effect |
|---|---|---|
| `new_or_expanded_requirement` | User pastes/expands requirement text | Run gap analysis; add/merge gaps; recompute score |
| `answer_pending_question` | User message answers an open gap's question | Mark matching gap(s) `answered`, store answer, recompute score, show "closed question X" notice |
| `command` | "write/update the PRD", "make it final" | Generate or re-sync the PRD artifact |
| `general_chat` | Anything else | Reply conversationally; no state mutation |

### 5.3 Auto-compaction

When verbatim message count exceeds a threshold (e.g. > 16 turns) or estimated tokens exceed a budget, summarize the oldest turns into `context_summary` (append/replace), keep the last K verbatim. The canonical state (gaps + PRD) is small and always sent in full, so **requirement detail is never lost** even after many turns. Unit-test the selector that decides what to keep vs summarize.

### 5.4 Feature flag + migration

- Flag `NEXT_PUBLIC_LIVING_WORKSPACE` (env) gates the new UI. Old phase-machine remains until flip.
- Existing rows render in the new workspace read-first: derive `gaps` from legacy `gap_list` + `clarification_questions` (all `open`), `prd` from legacy `requirements`. A small adapter in `lib/analysis/` does this on load.

### 5.5 Context layer (read first)

Three layers, merged in order **user → project → session**, prepended to the orchestrator prompt **before** any gap analysis:

1. **User profile / global memory** — new `user_context` table (one row per user): structured fields (`industry`, `role`, `compliance` regimes, `tech_defaults`) **plus** a free-text `standing_instructions` box (Claude-style "Instructions for Claude") **plus** an optional `prd_template`. Edited from Settings.
2. **Project memory** — existing Company Context (`company_context` / `Project.context`), per project. Extends/overrides the user layer.
3. **Session** — the requirement at hand.

The model is instructed to: (a) **not ask** questions already answered by known context (e.g. don't ask "what industry?" when `industry = fintech`); (b) raise a **`constraint_conflict`** gap when a requirement contradicts known context, naming what it conflicts with (e.g. "uses SFTP, but tech default is S3 — intentional?"); (c) honor compliance regimes (e.g. flag OJK risks). With empty context it degrades gracefully to today's behavior.

---

## 6. Phase 1 — User Stories

> Each story: **As a / I want / so that**, **Acceptance Criteria**, **Subtasks** (executable by a Claude Code agent), **DoD**.

### Story 1 — Living-session data model + orchestrator API

**As a** PM, **I want** my workspace state (chat, gaps, score, PRD) to persist and survive long sessions, **so that** I never lose work or hit a context wall.

**Acceptance Criteria**
- [ ] Migration `010_living_workspace.sql` adds all columns in §5.1; existing rows unaffected (verified by selecting an old row).
- [ ] `POST /api/workspace` accepts `{ sessionId, message? }`, streams an assistant reply via SSE, and persists updated state.
- [ ] The endpoint classifies the message into one of the four intents and applies the correct effect.
- [ ] Anthropic key is read only from `process.env.ANTHROPIC_API_KEY`; no key reaches the client (verify no client import).
- [ ] When message count exceeds the threshold, older turns are summarized into `context_summary` and the canonical state still contains every gap and the full PRD draft (covered by a test).
- [ ] Reloading the session reconstructs identical state (gaps, score, PRD, messages) from the DB.

**Subtasks**
1. Add types to `types/index.ts`: `WorkspaceGap`, `GapStatus`, `PrdDraft`, `WorkspaceState`, `WorkspaceIntent`.
2. Write `supabase/migrations/010_living_workspace.sql` per §5.1; apply via Supabase MCP `apply_migration`.
3. Create `lib/analysis/workspace-context.ts`: `buildCompactContext(state, messages)` → returns the trimmed payload; `selectMessagesToSummarize(messages, budget)`.
4. Create `lib/analysis/intent-router.ts`: parse the model's structured action; pure functions to apply each intent to `WorkspaceState` (`applyGapUpdates`, `resolveGaps`, `mergePrd`).
5. Create `app/api/workspace/route.ts`: load → build context → call Anthropic (SSE) → apply action → persist (`upsert` to `analysis_results`) → emit `done` with new state. Reuse SSE helpers and the model-routing util used by the existing `/api/analyze`.
6. Add server-side prompt(s) in `lib/analysis/prompts/` (or extend `lib/analysis/constants.ts`) for: gap analysis, intent classification, answer-matching, PRD generation.
7. Recompute readiness score using existing `lib/analysis/score-utils.ts` (extend if needed for answered/out-of-scope weighting).
8. Tests: `tests/lib/workspace-context.test.ts` (compaction keeps all gaps + PRD), `tests/lib/intent-router.test.ts` (each intent → correct state mutation).

**DoD:** migration applied; endpoint passes a scripted multi-turn conversation (paste → answer → write PRD) with state persisted and reloadable; tests green; `npm run build` + lint clean.

---

### Story 2 — Context layer (profile + memory) + constraint-aware gaps

**As a** PM, **I want** the AI to read my profile and project memory before analyzing, **so that** open questions are relevant to my world and contradictions with what I've already told it get flagged instead of ignored.

> Build right after Story 1 — it shapes the orchestrator prompt that every later story relies on.

**Acceptance Criteria**
- [ ] A Settings section lets me set structured fields (industry, role, compliance regimes, tech defaults) **and** a free-text "standing instructions" box **and** an optional PRD template; saved to a new `user_context` row (one per user).
- [ ] The orchestrator merges context in order **user → project → session** and prepends it to every turn's prompt **before** gap analysis.
- [ ] The AI does **not** ask questions already answered by known context (e.g. doesn't ask "what industry?" when `industry = fintech`).
- [ ] When a requirement contradicts known context, the AI raises a gap with category `constraint_conflict` and fills `conflictsWith` (e.g. "uses SFTP, but tech default is S3 — intentional?").
- [ ] When a relevant compliance regime is set (e.g. OJK), the AI surfaces likely violations/risks as gaps.
- [ ] Free-text standing instructions also influence how the PRD is written.
- [ ] With an empty profile, the workspace behaves like today (no crash, no degraded analysis).

**Subtasks**
1. Migration `supabase/migrations/011_user_context.sql`: `user_context` table (`user_id` PK/FK, `industry`, `role`, `compliance text[]`, `tech_defaults jsonb`, `standing_instructions text`, `prd_template text`, timestamps) + RLS so a user reads/writes only their row.
2. Add types to `types/index.ts`: `UserContext`; ensure `WorkspaceGap` supports `constraint_conflict` + `conflictsWith`.
3. Create `app/api/user-context/route.ts` (GET + PUT) — load/save the current user's context row.
4. Extend `app/(app)/settings/page.tsx` with a "Konteks & Memori" section: structured fields + standing-instructions textarea + PRD-template textarea.
5. Create `lib/analysis/context-loader.ts`: `loadContextLayers(userId, projectId)` → merged, prompt-formatted context block (user → project).
6. Inject the merged context at the top of the orchestrator system prompt (Story 1), with instructions to (a) skip known-answer questions, (b) emit `constraint_conflict` gaps on contradictions, (c) honor compliance regimes.
7. Tests: `tests/lib/context-loader.test.ts` — a contradiction yields a `constraint_conflict` gap; a known industry suppresses the "what industry?" question.

**DoD:** with a fintech + S3 profile, an SFTP requirement produces a `constraint_conflict` gap and the AI does not ask about industry; an empty profile still works; tests green; `npm run build` + lint clean.

---

### Story 3 — Chat-first workspace shell

**As a** PM, **I want** a chat-first layout instead of a form, **so that** it feels like talking to an assistant in a real workspace.

**Acceptance Criteria**
- [ ] Behind `NEXT_PUBLIC_LIVING_WORKSPACE`, `/analyze` renders three zones: sidebar · center chat · right artifact panel.
- [ ] An empty new session shows a welcoming composer (paste BRD or chat) — no big "Analisis BRD" form.
- [ ] Sending a message calls `/api/workspace`, streams the reply into the chat, and updates the artifact panel.
- [ ] The composer accepts long pasted BRDs (multi-line, large) without breaking layout.
- [ ] Center chat scrolls independently; artifact panel scrolls independently.
- [ ] UI copy in Bahasa Indonesia (per CLAUDE.md).

**Subtasks**
1. Create `components/analyze/workspace/WorkspaceShell.tsx` — 3-zone responsive layout (sidebar collapses < lg).
2. Create `components/analyze/workspace/ChatPanel.tsx` — message list (reuse styling from `RefinementChat.tsx`), streaming, composer with paste support.
3. Create `components/analyze/workspace/ArtifactPanel.tsx` — tab container (Gaps & Score / PRD; Flowchart placeholder for phase 2).
4. Add a flag-gated branch in `app/(app)/analyze/page.tsx` (or a new `WorkspaceClient.tsx`) that renders `WorkspaceShell` when the flag is on, else the existing machine.
5. Wire `useWorkspace` hook (`hooks/useWorkspace.ts`) holding session state + `sendMessage` calling `/api/workspace` via `readSSEStream`.
6. Empty-state component for a fresh session.

**DoD:** flag on → can paste a BRD, see streamed reply, panel reacts; flag off → old page unchanged; preview verified (screenshot) at lg and mobile widths.

---

### Story 4 — Gaps & Score panel

**As a** PM, **I want** clarifying questions and the readiness score to persist in a panel where I can answer or defer each, **so that** I can manage open questions while continuing the conversation.

**Acceptance Criteria**
- [ ] Panel lists every gap with its question, category, severity, and status badge.
- [ ] Each open gap has **Answer** (inline text) and **Dismiss as out-of-scope** actions.
- [ ] Answering sets status `answered`, stores the answer, and **raises the readiness score**; the gap stays visible (greyed/closed), not deleted.
- [ ] Dismissing sets status `out_of_scope`, also closes the gap and raises the score, and tags it for the PRD's "Assumptions & Out of Scope" section.
- [ ] A live readiness score (0–100) with label (Siap / Perlu Klarifikasi / Tidak Siap) updates as gaps close.
- [ ] New gaps discovered mid-conversation appear in the panel automatically.
- [ ] Score thresholds match existing logic (≥80 Siap, 50–79 Perlu Klarifikasi, <50 Tidak Siap).

**Subtasks**
1. Create `components/analyze/workspace/GapsScorePanel.tsx` — list + live score header (reuse `ScoreBreakdown.tsx` / `GapCard.tsx` styling where sensible).
2. Create `components/analyze/workspace/GapRow.tsx` — per-gap row with Answer field + Dismiss action + status badge.
3. Persist answer/dismiss via `/api/workspace` (intent `answer_pending_question`) OR a lightweight `PATCH /api/workspace/gap` for panel-only edits that don't need the model; recompute score server-side.
4. Optimistic UI update on answer/dismiss, reconcile with server response.
5. Wire new-gap arrival from the orchestrator `done` event into the panel.

**DoD:** answering and dismissing both persist, move the score, and survive reload; new gaps from chat appear; preview verified.

---

### Story 5 — Chat ↔ panel sync (auto-close questions answered in chat)

**As a** PM, **I want** the AI to recognize when I answer a question in chat, **so that** I don't have to also fill it in the panel.

**Acceptance Criteria**
- [ ] When a chat message answers one or more open gaps, the orchestrator marks them `answered` and stores the answer.
- [ ] The chat shows an explicit, non-silent notice of what was closed (e.g. "✓ Menutup pertanyaan: <question>"). No magic/hidden state changes.
- [ ] The Gaps & Score panel updates to reflect the closed questions and new score in the same turn.
- [ ] If the answer is ambiguous/partial, the gap stays open and the AI asks a focused follow-up (does not falsely close).

**Subtasks**
1. Extend the intent prompt to return `resolvedGapIds` + extracted answers when intent is `answer_pending_question`.
2. In `intent-router.ts`, apply `resolveGaps(resolvedGapIds, answers)` and produce a structured "closed" notice list.
3. Render closed-question notices inline in `ChatPanel.tsx` (distinct style from normal messages).
4. Test in `intent-router.test.ts`: a message that answers 2 of 3 questions closes exactly those 2.

**DoD:** scripted conversation closes the right questions, shows notices, leaves ambiguous ones open; test green.

---

### Story 6 — Living PRD artifact

**As a** PM, **I want** a PRD (epic + user stories + AC) generated on demand and kept in sync, **so that** I get a groomable handoff doc without leaving the workspace.

**Acceptance Criteria**
- [ ] PRD generates when **all gaps are closed** OR when I issue a command ("tulis PRD" / "write the PRD" / "finalkan").
- [ ] PRD can be generated **even with open questions**, which appear in an **"Open Questions"** section; out-of-scope items appear in **"Assumptions & Out of Scope."**
- [ ] PRD includes epic summary + user stories with acceptance criteria (reuse `UserStory` / `RequirementsResult` shape).
- [ ] Asking to "update the PRD" after closing more gaps re-syncs it and bumps `prd_version`; the Open Questions section shrinks accordingly.
- [ ] If a PRD template is set (`user_context.prd_template`), the PRD follows that structure; otherwise it uses the default (INVEST user stories + Gherkin AC).
- [ ] PRD is copyable / exportable (reuse `RequirementsExport.tsx` / `CopyActions.tsx`).
- [ ] PRD persists and reloads with the session.

**Subtasks**
1. Create `app/api/workspace/prd/route.ts` (or handle `command` intent inline) — generate PRD from canonical state; persist to `prd` + bump `prd_version`.
2. Create `components/analyze/workspace/PrdArtifact.tsx` — render markdown + structured user stories; Open Questions + Assumptions sections; copy/export actions.
3. Add PRD-generation prompt (epic + INVEST user stories + Gherkin AC, Bahasa Indonesia content where appropriate) to `lib/analysis/prompts/`. Read `prd_template` from the context layer and use it as the structure when present; otherwise use the default.
4. "Update PRD" affordance in the PRD tab + command recognition in chat.
5. Reuse/adapt `RequirementsExport.tsx` for export.

**DoD:** PRD generates with and without open questions; re-sync updates it and version; export works; reload preserves PRD; preview verified.

---

### Story 7 — Sidebar, resume & migration

**As a** PM, **I want** a Claude-style sidebar and to reopen any past session into the living workspace, **so that** I can navigate my work and never start over.

**Acceptance Criteria**
- [ ] Sidebar shows **New analysis**, **Recents** (ordered by `last_active_at`), and is ready for Search/Starred/Projects slots (phase 2).
- [ ] Clicking a recent session opens it in the living workspace with full state restored (chat, gaps, score, PRD).
- [ ] Legacy sessions (schema v1/v2) open correctly via the adapter (gaps derived as `open`, PRD from legacy `requirements`).
- [ ] New sessions start with one click and set `last_active_at`.
- [ ] Everything is behind `NEXT_PUBLIC_LIVING_WORKSPACE`; with the flag off the old experience is untouched.

**Subtasks**
1. Update `components/analyze/SessionSidebar.tsx` (or new `workspace/WorkspaceSidebar.tsx`) — New analysis + Recents ordered by `last_active_at`; structure slots for phase-2 features.
2. Create `lib/analysis/legacy-adapter.ts` — `toWorkspaceState(row)` mapping legacy columns → `WorkspaceState`.
3. Make `/analyze/[id]` (or the client) load via the adapter and render the workspace when the flag is on.
4. Update `last_active_at` on each `/api/workspace` turn.
5. Document the flag in README/env example.

**DoD:** open a brand-new and a legacy session, both restore correctly; recents ordered by activity; flag flip verified both ways; `npm run build` + lint clean.

---

## 7. Phase 2 — User Stories (specced now, built after Phase 1 is solid)

### Story 8 — Flowchart tab

**As a** PM, **I want** a flowchart of the requirement, **so that** I can visualize the flow as it firms up.

**AC:** Flowchart tab renders a Mermaid diagram generated from canonical state; regenerates on request and as gaps close; invalid Mermaid is caught/validated before render; flowchart persists in `flow_chart`.
**Subtasks:** add flowchart-generation prompt; `components/analyze/workspace/FlowchartTab.tsx` with Mermaid render + validation (use the Mermaid-validation tool/MCP); persist `flow_chart`; "regenerate" action.
**DoD:** flowchart renders and updates; invalid output handled gracefully.

### Story 9 — Session search

**As a** PM, **I want** to search my sessions, **so that** I can find past requirements fast.
**AC:** search box filters sessions by title + BRD text (server-side query, debounced); empty/no-results states.
**Subtasks:** `GET /api/sessions/search?q=`; search input in sidebar; debounce + results list.
**DoD:** search returns expected matches; verified with several sessions.

### Story 10 — Starred sessions

**As a** PM, **I want** to star sessions, **so that** important ones stay at the top.
**AC:** star/unstar toggles `starred`; a Starred group renders above Recents; persists.
**Subtasks:** `PATCH /api/sessions/:id` star toggle; star control in sidebar rows; Starred group.
**DoD:** star persists and groups correctly.

### Story 11 — Projects + Company Context in sidebar

**As a** Pro PM, **I want** projects with Company Context in the sidebar, **so that** the AI uses my standing context.
**AC:** create/select project from sidebar; selected project's Company Context is injected into the orchestrator prompt; remains Pro-gated; reuses existing `ProjectSelector` / `/api/projects`.
**Subtasks:** project picker in sidebar; pass `projectId` to `/api/workspace`; inject context into prompt; keep Pro gating.
**DoD:** Pro project context demonstrably affects analysis; free tier unaffected.

---

## 8. Epic-level Definition of Done

- [ ] Phase 1 stories 1–7 complete with their DoD met.
- [ ] Full happy path works end-to-end behind the flag: paste BRD → gaps appear → answer some / dismiss some / answer one in chat → score climbs → "write PRD" → PRD with Open Questions → close more → "update PRD" → Open Questions shrinks → reload → everything restored.
- [ ] A long session (> 16 turns) does not lose any gap or PRD content (compaction verified).
- [ ] Anthropic key never exposed client-side; all model calls via `/api/workspace*` (CLAUDE.md critical rule).
- [ ] `npm run build`, lint, and all tests pass.
- [ ] Old experience intact with flag off; flag documented.
- [ ] Session log written to `obsidian-vault/03-Sessions/` and `00-Index.md` updated (per CLAUDE.md).

## 9. Assumptions

- `claude-haiku-4-5` (per CLAUDE.md) is sufficient for intent routing + PRD; revisit if quality is weak on PRD generation.
- One requirement per session (multi-requirement notebooks explicitly deferred).
- Out-of-scope dismissals count as "resolved" for scoring; a session can reach a PRD with everything dismissed (with a visible Assumptions section).
- Solo audience → tier-gating kept minimal in Phase 1; Projects gating returns in Story 10.

## 10. Key files (reference for the executing agent)

- Page/state: `app/(app)/analyze/page.tsx`, `app/(app)/analyze/[id]/page.tsx`
- Context layer: `app/(app)/settings/page.tsx`, `app/api/user-context/route.ts` (new), `lib/analysis/context-loader.ts` (new), existing `company_context` / `Project.context`
- Components: `components/analyze/*` (reuse `RefinementChat`, `GapCard`, `ScoreBreakdown`, `RequirementsExport`, `CopyActions`, `SessionSidebar`, `OutputPanelV2`)
- APIs to consolidate: `app/api/analyze/route.ts`, `app/api/refine/route.ts`, `app/api/requirements/route.ts`, `app/api/save-session/route.ts`
- Libs: `lib/analysis/*` (`score-utils`, `refinement-state`, `summary-selector`, `constants`), `lib/sse-client.ts`
- Types: `types/index.ts`, `types/analysis-v2.ts`
- DB: `analysis_results` table; new migrations `supabase/migrations/010_living_workspace.sql`, `supabase/migrations/011_user_context.sql`
