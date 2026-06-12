---
title: "Session - Living BRD Workspace Debug + Integration Tests"
date: 2026-06-05
branch: feat/living-brd-workspace
status: Fixes committed; verification green
---

# 2026-06-05 - Living BRD Workspace Debug + Integration Tests

Debugged the Living BRD Workspace `POST /api/workspace` save path and model-response handling after browser reports of Supabase 404s and empty gap output.

## What changed

- Fixed `analysis_results` persistence for living workspace sessions:
  - Replaced `upsert(..., { onConflict: 'session_id' })` in `POST /api/workspace`.
  - New sessions now use `INSERT`.
  - Loaded sessions now use `UPDATE ... eq(id) ... eq(user_id)`.
  - Updated `PATCH /api/workspace/gap` to use explicit `UPDATE` as well.
- Root cause: `analysis_results.session_id` has a partial unique index (`WHERE session_id IS NOT NULL`), which is not a reliable PostgREST upsert conflict target. Existing RLS policies already allow own-row SELECT/INSERT/UPDATE for authenticated users.
- Improved model JSON diagnostics and parsing:
  - Added local-only raw response logging (`NODE_ENV !== 'production'`).
  - Added JSON-object extraction so accidental wrapper text/code fences do not break parsing when a valid JSON object is present.
  - Kept parse failure behavior safe: emits SSE `error` and does not persist state.
- Strengthened `buildWorkspaceSystemPrompt`:
  - Makes one-sentence concrete requirements classify as `new_or_expanded_requirement`.
  - Explicitly requires gap discovery for incomplete requirements.
  - Adds strict JSON output rules.
- Added `tests/api/workspace.test.ts` integration coverage:
  - New session `INSERT` path.
  - Existing session `UPDATE` path.
  - `newGaps` populates state and lowers score.
  - JSON parse failure emits SSE error and skips persistence.
  - Invalid severity is clamped to `medium`.
  - Unauthenticated request returns 401.
- Added Codex-style loading UX for pending workspace turns:
  - `GapsScorePanel` now shows `Menganalisis` and helper text instead of a misleading numeric `100` while Claude is responding.
  - `ArtifactPanel` passes `ws.isSending` into the score panel.
  - `ChatPanel` now uses a quiet inline pulse indicator (`StoryForge sedang menganalisis`) instead of plain static text.
  - Added component tests for the pending score and chat indicators.

## Commits

- `3b1ab67` - `fix(workspace): resolve upsert 404 on analysis_results`
- `8290b15` - `fix(workspace): fix gap detection in orchestrator prompt/parsing`
- `7ca2e1e` - `test(workspace): integration tests for /api/workspace route`

## Verification

- `npm test` - 306 passed / 52 files
- `npx tsc --noEmit` - exit 0
- `npm run lint:anthropic` - pass

## Notes

- Did not run the exact browser-console logged-in smoke POST because this session did not have an authenticated local browser session to reuse. The new route test exercises the POST path with controlled Supabase and Anthropic mocks.
- Browser check reached `/analyze`, but the current local session is logged out and showed the login screen, so authenticated visual smoke remains pending.
