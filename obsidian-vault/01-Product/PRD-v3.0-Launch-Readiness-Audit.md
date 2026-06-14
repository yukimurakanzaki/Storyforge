---
title: "StoryForge.id — Launch Readiness Audit (PRD v3.0)"
version: 1.0
date: 2026-06-14
owner: Adi (Product Owner)
author: Claude (acting as cross-functional review board)
status: Review artifact — NO CODE CHANGED. Evidence-grounded against the live repo.
audits: [[Requirements-Full-v3.0]]
---

# Launch Readiness Audit — PRD v3.0

> **What this is:** an honest, evidence-based review of StoryForge against PRD v3.0, produced by reading the actual code (not the PRD's status checkmarks). Every "Status" below is backed by a file/line or a named test. Where I could not verify something, it says **VERIFY**, not ✅.
>
> **What this is not:** a from-scratch build. The PRD is ~85% implemented and live on `main`. Re-running a 12-phase "build everything" simulation would regenerate working code and waste your budget. This is the part that was actually worth doing.

---

## 0. Launch Readiness Score: **58 / 100** (brutally realistic)

The analysis *engine* is genuinely good and largely done. But a **revenue-generating launch** needs three things you do not currently have working on the primary user flow: the ability to **measure** success, **enforce** limits, and **take payment**. That's what drags the score down.

| Dimension | Score | One-line reason |
|---|---:|---|
| Core analysis engine (gaps, score, questions, PRD) | 90 | Built, tested, live. Real strength. |
| Living Workspace UX | 85 | Code-complete, deployed; manual logged-in smoke still the only gap. |
| **Instrumentation (North Star / metrics)** | **25** | **The primary endpoint does not log `analysis_events` → WAA is unmeasured.** |
| **Tier enforcement (cost + conversion guardrail)** | **30** | **The primary endpoint enforces no usage limit and no watermark.** |
| Monetization (payment) | 10 | Designed (`design.md` ready), 0% built. No `/pricing`, `/admin`, or `/api/payment*`. |
| Auth & security | 75 | Signup-required enforced; key server-side; RLS present. Some hardening gaps. |
| Compliance & launch ops | 40 | Pages drafted; domain + email not live (your action). |
| Test suite health | 80 | 306/306 last recorded — **not re-run this session** (see §8). |

**Bottom line:** you could *demo* today and it would impress. You should **not** open paid beta until §2 (the headline finding) is fixed, or you'll be flying blind on WAA and giving away unlimited free usage.

---

## 1. The premise check

PRD v3.0 is a **status document**, not a greenfield spec. Confirmed against the repo:

- **Built & live:** P0-1 auth, P0-2 gap engine, P0-3 score, P0-4 questions, P0-5 living workspace, P0-6 context layer, P0-7 PRD gen, P0-8 key security, P0-13 landing.
- **Real remaining work:** P0-9 (enforcement/watermark — *worse than the PRD implies, see §2*), P0-10 (payment — unbuilt), P0-11 (compliance pages live — domain-blocked), P0-12 (domain — your action).

---

## 2. 🔴 HEADLINE FINDING — the new workspace silently dropped the business guardrails

> ✅ **UPDATE 2026-06-14 — FIXED on branch `fix/workspace-tier-enforcement`.** `/api/workspace` now: checks the usage limit and returns **429 + `X-Limit-Reached`** for a free user at the cap (billing unit = one NEW living session; continuing a session is free); **increments the usage counter**; **logs `analysis_started`/`analysis_completed`** to `analysis_events` (WAA restored); renders the free-tier **watermark** (OQ-6 copy, also in copied text); and wraps both model calls in an **AI timeout** (`withTimeout`). Evidence: `tests/api/workspace-enforcement.test.ts` (5), `tests/components/workspace/PrdArtifact.test.ts` (+2), `tests/lib/with-timeout.test.ts` (3). Full suite **321/0**, `tsc` clean, build exit 0. ⏳ Pending: merge + manual logged-in smoke. The findings below describe the pre-fix state.

The PRD's Risk table (#1, "API cost abuse") and P0-9 both say "**verify P0-9 covers the new endpoint.**" I verified it. **It does not.**

When the living workspace is on (it's default per OQ-3), the primary user action streams through **`POST /api/workspace`** ([route.ts](../../app/api/workspace/route.ts)). Compare it to the legacy **`POST /api/analyze`** ([route.ts](../../app/api/analyze/route.ts)):

| Capability | Legacy `/api/analyze` | New `/api/workspace` (now primary) | Evidence |
|---|---|---|---|
| Usage limit check (3/mo free) | ✅ `checkUsage` → 429 | ❌ **none** | analyze.ts:176 vs workspace.ts (no call) |
| Usage increment | ✅ `incrementUsage` | ❌ **none** | analyze.ts:334,410 vs workspace.ts |
| **`analysis_events` logging (WAA!)** | ✅ started + completed | ❌ **none** | analyze.ts:237,335,411 vs workspace.ts |
| Word-count tier limit (5k/10k) | partial | ❌ flat 150k chars only | workspace.ts:19 |
| Free-tier watermark | ✅ (RefinementChat) | ❌ **none in PrdArtifact** | Watermark only imported in `components/analyze/*` |
| AI timeout / abort-on-disconnect | ✅ `AI_TIMEOUT_MS` + signal | ❌ **none** | analyze.ts:280–287 vs workspace.ts |

**Why this is the #1 finding, in business terms:**

1. **You cannot measure launch success.** §10 of the PRD says WAA, completion rate, and P95 time are "Measured via `analysis_events`." The main flow writes zero events. On launch day you would not be able to answer "is anyone using this?" — your North Star Metric is dark.
2. **Free tier is effectively unlimited.** No usage cap on the main flow = no cost ceiling (Risk #1) **and** no upgrade pressure (undermines G4 conversion). Free users never hit "2/3 analisis bulan ini," so they never feel a reason to pay.
3. **OQ-3 makes it worse.** OQ-3 decided to *delete the legacy path at merge*. If `/api/analyze` is removed, these capabilities don't degrade — they **vanish**.

**Recommendation (do before any paid beta):** port `checkUsage` → 429, `incrementUsage`, and `logAnalysisEvent` (started/completed/duration) into `/api/workspace`, decide what counts as one "analysis" in a living session (recommend: first model turn per session = 1 analysis, so follow-ups don't burn quota), add the watermark to `PrdArtifact` for free plan, and add the AI timeout. This is the real content of P0-9 and it's **not** "partially built" — for the primary flow it's "not built."

---

## 3. Requirement Traceability Matrix (P0)

Status legend: ✅ verified in code · ⚠️ built but with a gap · 🔴 missing/broken on primary flow · ⏳ not built · 🔵 your action.

| PRD ID | Requirement | Implementation (verified) | Tests | Status |
|---|---|---|---|---|
| P0-1 | Signup required, no guest | [middleware.ts:5,114](../../lib/supabase/middleware.ts) routes unauth `/analyze`→`/login`; email-verify guard | `tests/lib/supabase/middleware.test.ts`, `guest-project-creation-gate.test.ts` | ✅ |
| P0-2 | Gap engine, 5 cats + severity + confidence + reference | `app/api/analyze/route.ts` (SYSTEM_PROMPT), `lib/prompts/workspace.ts`, `lib/analysis-validator.ts` | `api/analyze-v2.test.ts`, `analysis-validator.test.ts` | ✅ |
| P0-3 | Readiness Score 0–100 + labels, live recompute | `lib/analysis/score-utils.ts`, `workspace-score.ts`, `workspace-reducer.ts` | `score-utils.test.ts` (+property), `workspace-score.test.ts`, `workspace-reducer.test.ts` | ✅ |
| P0-4 | Clarification questions, ID, copy-ready | `lib/analysis/copy-formatter.ts` | `copy-formatter.test.ts` (+property) | ✅ |
| P0-5 | Living workspace (4-intent, compaction, panels, resume, legacy adapter) | `app/api/workspace/route.ts`, `lib/analysis/workspace-{reducer,context,store}.ts`, `components/workspace/*` | `api/workspace.test.ts`, `components/workspace/*.test.ts`, `workspace-store.test.ts` | ⚠️ works, but see §2 (no enforcement/metrics) + manual smoke pending |
| P0-6 | Context layer (user→project→session), `constraint_conflict` | `lib/analysis/context-loader.ts`, `workspace-context.ts`, `/api/user-context` | `context-loader.test.ts`, `workspace-context.test.ts` | ✅ (live fintech+S3→SFTP smoke still manual) |
| P0-7 | PRD gen (epic + INVEST + Gherkin), on-demand, version bump | `lib/analysis/normalize-prd.ts`, `components/workspace/PrdArtifact.tsx` | `normalize-prd.test.ts`, `PrdArtifact.test.ts` | ✅ |
| P0-8 | API key server-side only, SSE, ≤200k tokens | `lib/anthropic.ts`, `lib/sse.ts`, `lint:anthropic` CI rule | `anthropic.test.ts`, `sse.test.ts` | ✅ (CI-enforced) |
| P0-9 | **Tier enforcement + watermark, server-side** | Legacy: `lib/usage.ts` + analyze route. **Primary workspace route: absent** | `usage-tracking-enforcement.test.ts`, `pro-gate-*.test.ts` (cover **legacy** only) | 🔴 **broken on primary flow** (§2) |
| P0-10 | Manual payment flow (beta) | **None.** No `/pricing`, `/admin`, `/api/payment*`. Spec ready: [design.md](../../.kiro/specs/manual-payment-flow/design.md) | none | ⏳ next build item |
| P0-11 | Compliance pages + UU PDP erasure + RLS | `app/privacy/page.tsx`, `app/terms/page.tsx`, `lib/{privacy,terms}-content.ts`, `app/api/auth/delete-account/route.ts` | — | ⚠️ code exists; not live (domain) |
| P0-12 | Domain + email | — | — | 🔵 your action |
| P0-13 | Landing page (ID, CTA, Free/Pro) | `app/page.tsx` | — | ✅ (copy review pending) |

**Notable P1/cross-cutting:**
- **P1-6 tiered models (Free→Gemini):** `lib/model-selector.ts` returns Claude Haiku for *both* tiers. This **matches OQ-2** ("launch with Claude Haiku as built") — not a defect, a locked decision. ✅-as-intended.
- **Account deletion (UU PDP):** `app/api/auth/delete-account/route.ts` + `logout-all` exist. ✅ code present; verify it cascades all user rows.

---

## 4. Critical-Thinking Pass (challenging the PRD)

Each item: **Risk → Impact → Recommendation.**

### Contradictions (docs vs docs / docs vs code)
- **C1 — Pricing.** PRD v3.0 + `design.md` = **Rp 149k** beta, break-even 5, target 42 users. But `00-Index.md` "Unit Economics (Locked)" still says **Rp 199k**, 58% margin, 84 users. → *Impact:* you could quote William the wrong founding price. → *Rec:* PRD v3.0 wins; I've corrected the index (see session log). Keep price in ONE constant (`lib/payment/config.ts`) per design.md.
- **C2 — Watermark copy.** OQ-6 decided: `— Dibuat dengan StoryForge.id (Gratis) · storyforge.id`. Code says: `Generated by StoryForge.id — Upgrade ke Pro...` ([Watermark.tsx:18](../../components/analyze/Watermark.tsx)). → *Impact:* off-brand, English, wrong per decision. → *Rec:* update copy when you wire the watermark into the workspace (§2).
- **C3 — "design.md empty."** The 2026-06-10 index note said it's empty; it is **complete** (2026-06-11). Stale note only — P0-10 is unblocked. ✅

### Missing / under-specified requirements
- **M1 — "One analysis" is undefined for a living session.** Quota was designed for one-shot `/api/analyze`. A living workspace has many model turns. → *Rec:* define the billing unit before porting enforcement (recommend: 1 per session's first turn).
- **M2 — Admin auth surface.** `lib/auth/admin.ts` exists but there's no `/admin` route yet. P0-10 needs admin-only payment verification. → *Rec:* gate `/admin/*` in middleware (currently not in `isProtectedAppPath`) the moment the admin UI lands.
- **M3 — Rate limiting beyond quota.** `lib/auth/rate-limit.ts` exists (auth); no per-IP/per-user rate limit on `/api/workspace`. → *Rec:* lightweight Upstash limiter on the AI endpoint before public launch.

### Risks
| Type | Risk | Impact | Recommendation |
|---|---|---|---|
| Cost | Unlimited free usage on `/api/workspace` (§2) | High | Port `checkUsage` first |
| Product | WAA unmeasured (§2) | High | Port `logAnalysisEvent` first |
| Tech | Usage check-then-increment is non-atomic (TOCTOU); parallel requests can exceed the free cap | Med (low at beta scale) | Atomic counter (SQL `update ... returning`) or accept at beta, fix pre-scale |
| Tech | Pro plan is **uncapped** — `usage.ts:48` returns `allowed: plan==='pro' \|\| count<limit`, so Pro ≠ 50/mo | Low (cost) | Enforce 50 for Pro too, or document "soft unlimited" intentionally |
| Tech | No AI timeout on `/api/workspace`; a hung model call has no server cutoff | Med | Add `AI_TIMEOUT_MS` + abort, mirror analyze route |
| Ops | Single admin, manual verification | Med | `design.md` already mitigates (idempotent approve, audit events) |
| UX | At-limit upgrade CTA depends on enforcement that isn't firing | Med | Lands automatically once §2 is fixed |

---

## 5. Architecture Review (what's actually built)

**Shape:** Next.js App Router on Vercel · Supabase (Auth + Postgres/RLS + Storage) · Anthropic Haiku server-side · SSE streaming. Clean, conventional, appropriate for the scale.

- **Frontend:** route-group split (`(auth)`, `(app)`) with middleware gating; workspace = `useWorkspace` hook + pure `client-state.ts` (well-tested). Good separation.
- **Backend:** thin API routes delegating to pure libs (`workspace-{reducer,context,store,score}`). The reducer/score being pure + property-tested is a genuine strength.
- **AI orchestration:** the **canonical-state compaction** (`workspace-context.ts`) is the real moat — persists compact state, sends only that to the model → "never maxes out." Verified present and tested.
- **Streaming:** custom SSE (`lib/sse.ts`) used consistently.
- **DB:** 12 migrations; RLS referenced. ⚠️ migrations `005` + `008` flagged unrun in the index — **verify they're applied in prod Supabase** before launch.
- **Analytics/Monitoring:** ⚠️ this is the weak layer — `analysis_events` is the only telemetry and §2 shows it's not written on the primary flow. No error monitoring (Sentry-class) noted.

**Scalability 100 → 1k → 10k users:** architecture holds without rewrite (Vercel + Supabase + per-user RLS scoping; P2-2 `org_id` layer is cleanly addable). The constraints that bite first are **operational**, not architectural: (a) manual payment verification by one human (fine ≤ ~50 payers), (b) the non-atomic usage counter (fix before ~1k), (c) no rate limiting (add before public launch). No structural blocker to 10k.

---

## 6. Edge-Case Coverage (Phase 3) — honest

| Case | Handled? | Where / gap |
|---|---|---|
| Empty / whitespace message | ✅ | workspace.ts:119 returns 400 |
| Oversized input | ⚠️ | flat 150k-char cap (workspace.ts:19); **not** the 5k/10k word tier limit |
| Unauthenticated | ✅ | 401 at route + middleware redirect |
| Malformed model JSON | ✅ | `extractFirstJsonObject` + parse guard → error event |
| Malicious model output (bad severity) | ✅ | `sanitizeTurn` clamps severity, de-conflicts ids |
| Prompt injection in BRD | ⚠️ | Legacy wraps BRD in `<BRD_CONTENT>` "data not instructions" (analyze.ts:300). **VERIFY** the workspace prompt does the same framing |
| User disconnects mid-stream | ⚠️ | analyze route aborts on signal; **workspace route does not** |
| AI timeout | 🔴 | analyze route has `AI_TIMEOUT_MS`; **workspace route has none** |
| Supabase persist failure | ✅ | workspace.ts:183 emits error event, no partial done |
| Duplicate / replayed payment proof | ⏳ | designed in `design.md` (idempotent approve), not built |
| Legacy (pre-workspace) session resume | ✅ | `rowToState` / store legacy fallback; `workspace-store.test.ts` |

---

## 7. Security Review

- ✅ **API key** server-side only, CI-enforced (`lint:anthropic`), ZDR gated for Pro.
- ✅ **Authz** via RLS + `.eq('user_id', …)` scoping on workspace reads/writes; Pro project-context fetch RLS-guarded (analyze.ts:222).
- ✅ **Auth** signup-required, email-verification guard, password rules (`lib/auth/password.ts`).
- ⚠️ **Debug logging** left in: `[DEBUG MIDDLEWARE]` (middleware.ts:71, e2e-gated) and an unconditional `console.log` at analyze.ts:388. Low risk; clean up.
- ⚠️ **No rate limiting** on the AI endpoint (M3).
- ⚠️ **Payment storage** must be a **private** bucket with signed-URL admin access (design.md says so — enforce when building).
- 🔵 **UU PDP**: deletion route exists; confirm it removes `analysis_results`, `usage_counters`, `analysis_events`, `user_context`, storage objects.

---

## 8. Test / QA status (honest provenance)

- **Last recorded (2026-06-05 session):** 306/306 tests, `tsc --noEmit` clean, `lint:anthropic` pass, build compiles.
- **This session:** I did **not** re-run the suite (you asked for docs only). Treat "green" as *last recorded*, not *verified now*.
- **Coverage gap that matters:** the existing usage/pro-gate tests cover the **legacy** route. There is **no test asserting `/api/workspace` enforces limits or logs events** — which is exactly why §2 slipped through. Add those tests when you fix §2 (they'll fail first, proving the gap).
- **No E2E for the workspace happy path** found in the unit suite (Playwright specs were for the legacy flow). The PRD's P0-5 DoD ("full happy path E2E") is **not** met yet.

---

## 9. What to do next (in order) — for a non-technical owner

**You (mechanical, unblock external):**
1. Fix production Google OAuth (Supabase → URL Configuration allow-list).
2. Register **storyforge.id** → point at Vercel → Cloudflare email forwarding.
3. Confirm Supabase migrations `005` + `008` (and `010`, `011`) are applied in prod.

**Me (code, when you say go — pick one):**
4. **🔴 Fix §2 first** — port usage check + increment + `analysis_events` logging + watermark + AI timeout into `/api/workspace`, with the failing tests that prove it. *This is the single highest-leverage change: it restores measurement, cost control, and conversion pressure.* ~half a day.
5. **Build P0-10 payment** per `design.md` (only after §2, since payment activates the very entitlements §2 enforces).
6. Cleanups: correct watermark copy (C2), delete dead `SAMPLE_BRD`, remove debug logs.

> **My recommendation:** do **#4 before anything else buildable.** Launching paid beta without it means you can't tell if it's working and can't stop free-tier cost — and OQ-3's "delete legacy path" would erase the only place those guardrails currently live.

---

**Evidence note:** every status in this document is grounded in a file/line or named test read on 2026-06-14. No application code was changed in producing it.
