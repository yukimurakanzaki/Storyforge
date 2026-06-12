---
title: "Session — Living BRD Workspace Phase 1 BUILD (Backend + Frontend)"
date: 2026-06-05
branch: feat/living-brd-workspace
epic: [[Epic-Living-BRD-Workspace]]
status: Phase 1 code-complete (F1–F9); manual smoke + merge pending
---

# 2026-06-05 — Living BRD Workspace, Phase 1 Build

Executed the two Phase-1 plans (backend Tasks 0–15, frontend F1–F9) using subagent-driven
development: a fresh implementer subagent per task group, followed by a spec-compliance review
and a code-quality review on each. Built on branch `feat/living-brd-workspace` (off the
`feat/done-state-completion-ux` tip, so the V2 components it reuses are present).

## What shipped ✅

### Backend (Stories 1–2)
- **Shared contract + pure libs** (`types/workspace.ts`, `lib/analysis/workspace-{score,reducer,context,store}.ts`, `lib/prompts/workspace.ts`, `lib/analysis/context-loader.ts`) — 20 unit tests, all green.
  - Severity-based readiness score (open high −15 / med −8 / low −3, floor 0).
  - Pure turn reducer (`applyTurn`) — adds/dedupes gaps, resolves answered/out-of-scope, bumps PRD version.
  - Context compaction + bounded model payload (never sends full raw history).
  - Row⇄state store with **legacy fallback** (old `gap_list`/`clarification_questions`/`requirements` rows open as `open` gaps).
- **Migrations applied** to Supabase (`shnbucctqnaruflfdszg`): `010_living_workspace` (gaps, prd, title, starred, context_summary, summarized_up_to, flow_chart, last_active_at + indexes + widened status CHECK to include `'active'`) and `011_user_context` (per-user memory table + RLS).
- **Orchestrator route** `POST /api/workspace` — one model turn: load → compact-if-needed → Anthropic (`claude-haiku-4-5` via `@/lib/anthropic`) → parse `ModelTurnResponse` → `sanitizeTurn` (hardening, see below) → `applyTurn` → upsert → SSE `done {assistantMessage, intent, resolvedGapIds, state}`.
- **Context layer** — `loadContextLayers` reads user profile/memory (+ Pro project context) and prepends it to every prompt; model is told to skip known-answer questions and raise `constraint_conflict` gaps on contradictions (SFTP vs S3, OJK, …).
- **Supporting routes/UI** — `GET /api/workspace` (resume), `PATCH /api/workspace/gap` (panel answer/dismiss, no model call), `GET/PUT /api/user-context`, and a "Konteks & Memori" section added to `/settings`.

### Frontend (Stories 3–7, behind `NEXT_PUBLIC_LIVING_WORKSPACE`)
- `lib/workspace/client-state.ts` (pure helpers) + `hooks/useWorkspace.ts` (SSE + gap PATCH + resume).
- Components under `components/analyze/workspace/`: `EmptyState`, `ChatPanel` (with "✓ Menutup pertanyaan" notices), `GapsScorePanel` + `GapRow`, `ArtifactPanel` (Gaps/PRD tabs) + `PrdArtifact`, `WorkspaceSidebar` (recents + resume), `WorkspaceShell` (3-zone layout).
- `/analyze` page is now a **thin flag wrapper**: flag on → `WorkspaceShell`; flag off → `LegacyAnalyzeClient` (the old page body, moved byte-for-byte, only the export name changed).

## Code-review hardening folded in
The reducer review flagged untrusted-LLM-input risks; fixed in the route's `sanitizeTurn`:
1. Clamp any out-of-enum gap `severity` to `medium` (prevents `NaN` score).
2. Drop gap ids that appear in both `resolvedGapIds` and `outOfScopeGapIds` (answer wins).

## Verification (whole branch)
- `npx tsc --noEmit` — clean.
- `npm run lint:anthropic` — pass (no model call bypasses `@/lib/anthropic`; key never client-side).
- `npm test` — **298 passed (50 files)**, +6 new suites / +37 new tests.
- `npm run build` — succeeds (only the pre-existing `middleware→proxy` deprecation warning).
- Old `/analyze` untouched with the flag off.

## Deliberately NOT done
- **Task F10** (flag-flip cleanup that deletes `SampleBRD` + the legacy page) — run only when making the workspace default-on for everyone.
- **Manual smoke tests (Tasks 9 & 14)** — require a logged-in browser session; see "Next steps".
- Phase 2 (flowchart tab, search, starred, projects).

## Next steps (owner — non-technical)
1. **Try it locally:** `npm run dev`, open `http://localhost:3000/analyze` while logged in (the flag is already set in `.env.local`). Paste a short requirement → gaps + score appear → answer some / dismiss some / type "tulis PRD" → PRD tab fills.
2. **Context smoke test:** in `/settings → Konteks & Memori`, set Industri `fintech` and a tech default `storage: S3`, save. Then in `/analyze` paste a requirement that says it uses **SFTP** → expect a `constraint_conflict` gap and **no** "industri apa?" question.
3. **When happy:** decide how to land the branch (open a PR for review, or merge to main). It's currently local-only on `feat/living-brd-workspace`.
4. **To turn it on in production later:** set `NEXT_PUBLIC_LIVING_WORKSPACE=true` in Vercel, then (optionally) run Task F10 to remove the legacy path.

## Carry-forward / minor polish (non-blocking)
- `saveContext` in `/settings` has no error branch on a failed PUT (silent). Plan-prescribed; tidy later.
- `loadContextLayers` (the Supabase half) is untested; add a mock-backed test when convenient.
- Consider a `WorkspaceShell.test.ts` for the hasSession/error-banner branching.
