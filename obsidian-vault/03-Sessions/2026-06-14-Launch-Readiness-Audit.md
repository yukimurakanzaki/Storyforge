---
title: "2026-06-14 — Launch Readiness Audit (PRD v3.0)"
date: 2026-06-14
type: session
tags: [audit, review, pre-launch, no-code]
related: [[Requirements-Full-v3.0]], [[PRD-v3.0-Launch-Readiness-Audit]]
---

# Session — Launch Readiness Audit (PRD v3.0)

**Goal:** asked to "deliver a production-ready implementation" of PRD v3.0 via a 12-phase software-org process. Reframed honestly: PRD v3.0 is ~85% built and live, so a from-scratch build would regenerate working code. Owner chose **"planning/review docs only — no code."** Produced an evidence-grounded audit instead.

## What I did
- Read PRD v3.0 in full + 00-Index + payment `design.md`.
- Mapped P0 requirements to actual files/tests by reading the code (not trusting status checkmarks).
- Wrote [[PRD-v3.0-Launch-Readiness-Audit]] — RTM, critical-thinking pass, architecture review, edge-case + security review, launch readiness score.
- Corrected the stale pricing in 00-Index (C1: 199k → 149k per OQ-1).

## 🔴 Headline finding (verified in code)
The primary endpoint **`POST /api/workspace`** (the live living-workspace flow) **does not** call `checkUsage`, `incrementUsage`, or `logAnalysisEvent`, has no watermark, and no AI timeout — all of which the legacy `/api/analyze` route **does** have.

Consequences:
1. **WAA / North Star unmeasured** on the main flow (`analysis_events` never written) → can't tell if launch works.
2. **Free tier effectively unlimited** → no cost ceiling (Risk #1) and no upgrade pressure (G4).
3. OQ-3's "delete legacy path" would *erase* the only place these guardrails live.

This is the true content of P0-9, and for the primary flow it is "not built," not "partially built."

## Other findings
- C1 pricing inconsistency (index vs PRD) — **fixed** in index.
- C2 watermark copy doesn't match OQ-6 decision (English + wrong wording).
- Pro tier is uncapped (`usage.ts:48`), contradicting 50/mo.
- Usage counter is non-atomic (TOCTOU) — low impact at beta scale.
- `SAMPLE_BRD` is dead code in `lib/constants.ts`; debug `console.log`s in middleware + analyze route.
- Workspace happy-path E2E (P0-5 DoD) not met; existing usage/pro-gate tests cover legacy route only.

## Launch Readiness Score: **58/100**
Engine strong (90); instrumentation (25) and enforcement (30) on the primary flow are the drags; payment 10%; compliance/domain 40% (your action).

## Verification provenance
- Status claims grounded in files/lines read 2026-06-14. **No code changed** (audit + two doc edits only).
- Test suite **not re-run** this session; "306/306 green" is last-recorded (2026-06-05).

## Next steps
1. (You) Fix prod Google OAuth allow-list → register storyforge.id → email forwarding → confirm migrations 005/008/010/011 applied.
2. (Me, on go) **Fix the §2 workspace-enforcement gap first** (usage + events + watermark + timeout, with failing tests). ~half a day. → **DONE, see Part 2.**
3. (Me) Build P0-10 manual payment per `design.md` — after §2.
4. (Me) Cleanups: watermark copy (C2) → **done**; delete `SAMPLE_BRD` (still dead code); remove debug logs (still present).

---

## Part 2 — §2 fix implemented (branch `fix/workspace-tier-enforcement`)

TDD throughout (failing test → minimal code → green). `/api/workspace` now matches the legacy route's guardrails:

- **Usage limit:** `checkUsage` → **429 + `X-Limit-Reached`** when a free user at the cap starts a NEW session. Billing unit decided: **1 analysis = 1 new living session**; continuing an existing session is always allowed and never consumes quota (the living-workspace promise).
- **Quota increment:** `incrementUsage` on new-session success only.
- **WAA restored:** `logAnalysisEvent` `analysis_started` (every turn) + `analysis_completed` (with duration) → `analysis_events` now written on the primary flow.
- **Watermark (C2 fixed):** new `FREE_WATERMARK` constant (OQ-6 copy); rendered in `PrdArtifact` for free plan **and appended to copied text** (closes the copy-bypass). `plan` threaded server page → `WorkspaceShell` → `ArtifactPanel` → `PrdArtifact`. Legacy `Watermark.tsx` now uses the same constant.
- **AI timeout:** new pure `lib/with-timeout.ts` wraps both model calls (`AI_TIMEOUT_MS`) so a hung upstream can't hold the SSE open.

**Files:** `app/api/workspace/route.ts`, `app/(app)/analyze/page.tsx`, `components/analyze/workspace/{PrdArtifact,ArtifactPanel,WorkspaceShell}.tsx`, `components/analyze/Watermark.tsx`, `lib/constants.ts`, `lib/with-timeout.ts` + 3 test files.

**Verification (this session):** full suite **321/0**, `tsc --noEmit` clean, `lint:anthropic` pass, eslint introduced no new issues, `npm run build` exit 0 (`/analyze` now server-rendered on demand). **Not committed** — left on the branch for your review. ⏳ Manual logged-in smoke still recommended before merge.
