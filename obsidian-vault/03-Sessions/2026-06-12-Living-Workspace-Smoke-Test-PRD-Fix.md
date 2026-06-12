# Session: Living Workspace Smoke Test + PRD Render Fix

**Date:** 2026-06-12
**Branch:** feat/living-brd-workspace
**Status:** Completed — smoke test passed after fixing one real bug

## Goal

Run the first real logged-in smoke test of the Living BRD Workspace (code-complete but never exercised end-to-end in a browser), before deciding to register the domain / merge.

## What Was Done

- Started the dev server with `NEXT_PUBLIC_LIVING_WORKSPACE=true` and minted a **real** Supabase session for a throwaway test user (`smoketest@storyforge.id`) via the service-role admin API — no passwords typed into any form. Test user + data deleted afterward.
- Verified the full happy path end-to-end against the **real** Anthropic API and Supabase:
  1. `/analyze` correctly gates behind login (guest mode is gone — matches v2.0).
  2. Empty workspace renders with no sample BRD (owner rule respected).
  3. Paste BRD → 6 real gaps + Readiness Score **31 "Tidak Siap"** (correct <50 threshold), streamed.
  4. Answer in chat → AI recognized answers, rendered explicit **"✓ Menutup pertanyaan"** notices (chat↔panel sync works), and surfaced deeper follow-up gaps (correct behavior).
  5. **PRD generation** → renders markdown body + Open Questions (6) + Asumsi (4), with Salin/Perbarui actions.
  6. Reload + resume from sidebar Recents → chat, PRD, version all restored from DB.

## Bug Found & Fixed (the reason the smoke test mattered)

**PRD generation crashed the page** with `Objects are not valid as a React child (found: object with keys {id, question, impact, priority})` at `PrdArtifact`.

- **Root cause:** prompt ↔ contract mismatch. The PRD prompt told the model to "produce a full markdown PRD," but the strict-shape example only ever showed `"prd":null` — never the *populated* shape. So the model improvised its own structure (`{title, epics:[...], openQuestions:[{objects}], technicalNotes}`) with **no `markdown` field** and `openQuestions` as objects. The reducer/component expect `{markdown: string, openQuestions: string[], assumptions: string[]}`.
- **Fix (two layers):**
  1. **Prompt** (`lib/prompts/workspace.ts`): now shows the exact populated `prd` shape (3 keys; `openQuestions`/`assumptions` as string arrays; all PRD content inside the `markdown` string). Verified live — the model now returns the correct shape.
  2. **Defensive normalizer** (`lib/analysis/normalize-prd.ts`, wired into `workspace-reducer.ts`): coerces ANY model `prd` shape into the contract — objects → strings, structured `epics[]` → synthesized markdown — so the UI can never crash on model drift. Covered by `tests/lib/normalize-prd.test.ts` (incl. the exact drift shape the live model produced).

## Also Fixed (pre-existing, unrelated)

- `tests/lib/supabase/middleware.test.ts` had a stale assertion expecting `/analyze` to be public for "guest analysis." Guest mode was removed in v2.0 and the source correctly protects `/analyze` (verified live via the login redirect). Updated the test to expect `true`.

## Verification (all green)

- `npm run build` ✓ (all routes compile, incl. `/api/workspace`)
- `npx tsc --noEmit` ✓
- `npm run lint:anthropic` ✓ (key never client-side)
- `npx vitest run` → **311/311 pass**
- Live browser smoke test ✓ (screenshots captured); no console errors after fix.

## Files Changed

- `lib/prompts/workspace.ts` — PRD output shape made explicit
- `lib/analysis/normalize-prd.ts` (new) — defensive PRD normalizer
- `lib/analysis/workspace-reducer.ts` — use normalizer
- `tests/lib/normalize-prd.test.ts` (new)
- `tests/lib/supabase/middleware.test.ts` — stale guest-mode assertion fixed

## Pending / Next

1. **Living workspace is now smoke-test verified.** Safe to merge `feat/living-brd-workspace` → main, flip flag default-on, delete legacy `/analyze` (Task F10).
2. Then register `storyforge.id` (was blocked on "does it actually work?" — now answered: yes).
3. Then build the manual payment flow Phase A (design.md is ready).
4. Minor UX note (not blocking): answering questions can *lower* the score when answers expose deeper gaps — correct behavior, but consider signaling "found N deeper gaps" so it doesn't feel punishing.
