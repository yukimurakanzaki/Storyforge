# 📋 StoryForge Project Index

**Last Updated:** 2026-06-24 (WIB)
**Status:** Pre-MVP — **P0 BUILD COMPLETE & triple-rehearsed (local Supabase stack).** All review findings closed: migrations (prod-gap + clean-replay), deterministic grants + TRUNCATE/DELETE lockdown, literal-`service_role` RLS matrix, fail-closed enforcement + write-error propagation, compat-deploy `PGRST205` safety, `next@16.2.9`/`ws@8.21.0`, real-API gauntlet **8/8** (49/50/51 + AI-suppression + Free smoke + oversized→150k), and the loopback-guarded harness. Gates: unit 355/8-skip · tsc/lint/build 0 · E2E 3/3 · prod audit 0 high/3 mod. **No production touch authorized — awaiting `APPROVE P0 PROD`.** See [[03-Sessions/2026-06-23-P0-Build-Complete-Local-Rehearsal]].

---

## 🚀 Quick Navigation

### Product
- [[01-Product/Roadmap-2026-06-19-Review-Board|Review Board Roadmap (v1.2)]] — **EXECUTION SOURCE** — 7-persona review → phased plan (P0…P4), beta gates, metric stack, locked decisions
- [[01-Product/Build-Spec-v1.0|Build Spec v1.0]] — **DELIVERY SPEC** — journeys, screen states, Bahasa copy bank, quota rules, DB/API contracts, payment state machine, eval fixtures, DoD
- [[01-Product/PRD-v3.0-Launch-Readiness-Audit|Launch Readiness Audit]] — evidence-based audit (58/100); flags workspace enforcement/metrics gap
- [[01-Product/Requirements-Full-v3.0|Full Requirements v3.0]] — **LATEST** consolidated PRD (2026-06-10)
- [[01-Product/PRD-v1.5|PRD v1.5]] — Complete spec, production-ready
- [[01-Product/North-Star-Metric|North Star Metric]] — WAA = Weekly Active Analyzers
- [[01-Product/Compliance|Compliance Package]] — Privacy, ToS, ZDR config
- [[01-Product/Positioning|Positioning]] — Dual segment: PM + Vibe Coder

### Technology
- [[02-Tech/API-Architecture|API Architecture]] — Anthropic claude-haiku-4-5, streaming, ZDR
- [[02-Tech/Database-Schema|Database Schema]] — Supabase tables v1.5
- [[02-Tech/Stack-Rationale|Stack Rationale]] — Why Vercel + Supabase + Anthropic
- [[02-Tech/Decisions|Tech Decisions]] — Trade-offs documented

### Sessions & Progress
- [[03-Sessions/2026-06-23-P0-Build-Complete-Local-Rehearsal|2026-06-23: P0 BUILD Complete + Local Rehearsal]] — **LATEST** — P0 BUILD closed; all review findings fixed; triple-rehearsed on a local stack; production awaits `APPROVE P0 PROD`
- [[03-Sessions/2026-06-23-P0-Local-Rehearsal-Review|2026-06-23: P0 Local Rehearsal Review]] — migration path works; profile grants, genuine service-role tests, and real API gauntlet still block BUILD completion
- [[03-Sessions/2026-06-22-P0-Build-Gate-Review|2026-06-22: P0 Build Gate Review]] — **LATEST** — local gates green; paid branch blocked on error handling, silent writes, and production dependency audit
- [[03-Sessions/2026-06-21-Claude-P0-Preflight-Review|2026-06-21: Claude P0 Preflight Review]] — **LATEST** — revise before approval; security/QA/product/UI findings
- [[03-Sessions/2026-06-14-Launch-Readiness-Audit|2026-06-14: Launch Readiness Audit (PRD v3.0)]] — **LATEST**
- [[03-Sessions/2026-06-12-Production-Google-OAuth-Debug|2026-06-12: Production Google OAuth Debug]]
- [[03-Sessions/2026-06-12-Merge-and-Deploy|2026-06-12: Merge + Deploy to Vercel]] — **LATEST**
- [[03-Sessions/2026-06-12-Living-Workspace-Smoke-Test-PRD-Fix|2026-06-12: Living Workspace Smoke Test + PRD Render Fix]]
- [[03-Sessions/2026-06-10-manual-payment-flow-tradeoff-analysis|2026-06-10: Manual Payment Flow Trade-off Analysis]]
- [[03-Sessions/2026-06-05-Living-BRD-Workspace-Debug-Tests|2026-06-05: Living BRD Workspace Debug + Integration Tests]] - **LATEST**
- [[03-Sessions/2026-06-05-Living-BRD-Workspace-Phase1-Build|2026-06-05: Living BRD Workspace — Phase 1 BUILD]] — **LATEST**
- [[03-Sessions/2026-06-05-Web-App-Design-Guidance|2026-06-05: Web App Design Guidance]]
- [[03-Sessions/2026-06-05-GitHub-SaaS-Repo-Research|2026-06-05: GitHub SaaS Repo Research]] — **LATEST**
- [[03-Sessions/2026-06-03-Living-BRD-Workspace-Planning|2026-06-03: Living BRD Workspace — Epic & Phase 1 Plans]] — **LATEST**
- [[03-Sessions/2026-06-03-Done-State-Completion-UX|2026-06-03: Done-State Completion UX]]
- [[03-Sessions/2026-06-02-PRD-Refinement-Enhanced-Analysis|2026-06-02: PRD Refinement Enhanced Analysis Engine]]
- [[03-Sessions/2026-05-27-Portfolio-Mockup-Animation-Design|2026-05-27: Portfolio Mockup Animation & Design Fixes]] — **LATEST**
- [[03-Sessions/2026-05-27-Portfolio-Design-Audit-Fix|2026-05-27: Portfolio Design Audit & Fix]]
- [[03-Sessions/2026-05-24-Portfolio-Deploy|2026-05-24: Portfolio Deploy to Production]]
- [[03-Sessions/2026-05-24-Portfolio-Production-Readiness|2026-05-24: Portfolio Production Readiness Audit]]
- [[03-Sessions/2026-05-23-impeccable-design-polish|2026-05-23: Impeccable Design Audit & Polish]]
- [[03-Sessions/2026-05-21-eslint-flat-config-migration|2026-05-21: ESLint Flat Config Migration & Clean Build]]
- [[03-Sessions/2026-05-10-password-auth-admin-beta|2026-05-10: Password Auth + Admin Beta Magic Link]]
- [[03-Sessions/2026-05-09-awesome-wescoff-merge-conflict|2026-05-09: Awesome Wescoff Merge Conflict Resolution]]
- [[03-Sessions/2026-05-01-output-trust-layer|2026-05-01: Output Trust Layer]]
- [[03-Sessions/2026-04-29-auth-magic-link-fix|2026-04-29: Auth Magic Link Fix]] — **LATEST**
- [[03-Sessions/2026-04-29-session-saved-after-guest-mode-push|2026-04-29: Session Saved After Guest Mode Push]] — **LATEST**
- [[03-Sessions/2026-04-28-guest-mode-activation|2026-04-28: Guest Mode Activation]] — **LATEST**
- [[03-Sessions/2026-04-23-playwright-e2e-error-path-added|2026-04-23: Playwright E2E Error Path Added]] — **LATEST**
- [[03-Sessions/2026-04-23-playwright-e2e-expanded|2026-04-23: Playwright E2E Expanded]]
- [[03-Sessions/2026-04-23-playwright-e2e-added|2026-04-23: Playwright E2E Added]]
- [[03-Sessions/2026-04-23-end-to-end-validation|2026-04-23: End-to-End Validation]]
- [[03-Sessions/2026-04-05-API-Live|2026-04-05: API Live + Domain Secured]]
- [[03-Sessions/2026-04-05-API-Fix|2026-04-05: API Fix]] 
- [[03-Sessions/2026-03-29-PRD-Review|2026-03-29: PRD Review]]

### Launch
- [[04-Launch/Beta-Users|Beta Users]] — William + PM A, B, C, D
- [[04-Launch/Compliance-Checklist|Compliance Checklist]] — Pre-launch tasks
- [[04-Launch/Launch-Timeline|Launch Timeline]] — 8-week sprint

### Backlog
- [[05-Backlog/Ideas|Ideas]] — Future features
- [[05-Backlog/User-Feedback|User Feedback]] — From validation
- [[05-Backlog/Tech-Debt|Tech Debt]] — Known issues

---

## 📊 Current Metrics

| Metric | Target | Status |
|---|---|---|
| **WAA (Soft Launch)** | 4 | ⬜ Pre-launch |
| **WAA (30 days)** | 15 | ⬜ Pre-launch |
| **Free → Pro Conversion** | 15% | ⬜ Pre-launch |
| **API Cost per User** | Rp 1.200 | ✅ Calculated |
| **Break-even** | 5 paying users | ✅ Locked |

---

## Latest Status — 2026-06-23

### Local Supabase rehearsal reviewed — P0 BUILD still open

- **Passed:** prod-gap migration, backfill + trigger parity, schema/RLS checks, and 351/351 unit tests.
- **Corrected:** profile TRUNCATE/DELETE privilege hole, service-role profile access, and literal service-role matrix execution.
- **Verified:** real local `/api/workspace` gauntlet passes 7/7 across Free and Pro boundaries with AI suppression on rejects.
- **Final DoD gaps:** refuse non-loopback gauntlet URLs before client creation; add the missing oversized-input real-local smoke; rerun full gates including build/E2E.
- **Boundary:** remain on Supabase Free; no production action before final BUILD evidence and separate `APPROVE P0 PROD` with manual backup.

See [[03-Sessions/2026-06-23-P0-Local-Rehearsal-Review]].

---

## Previous Status — 2026-06-22

### P0 local build reviewed — paid branch not approved yet

- **Verified green:** 341/341 unit tests, TypeScript, lint, Next 16.2.9 build, and 3/3 Playwright tests.
- **Corrected:** subscription taxonomy, Supabase write propagation, RLS rollback safety, production `ws`, and the legacy `/api/analyze` pre-migration analytics failure path.
- **Verified green:** 351/351 unit tests, TypeScript, lint, Next 16.2.9 build, 3/3 Playwright, and production audit at 0 High / 3 Moderate. The final compatibility regression also passed a deliberate red/green check.
- **Cost decision:** remain on Supabase Free; the paid branch authorization is superseded and no paid branch should be created.
- **Replacement gate:** run the full migration/RLS/Pro/Free gauntlet against a local Supabase CLI + Docker production-like fixture.
- **Boundary:** no production DB, deploy, environment, auth-user, or flag change; `APPROVE P0 PROD` remains separately gated and requires a verified manual backup on Free.

See [[03-Sessions/2026-06-22-P0-Build-Gate-Review]].

---

## Previous Status — 2026-06-21

### Claude P0 preflight reviewed — revise before approval

- **Live state reconfirmed:** 3 enforcement/analytics tables still missing; 2 auth users, 0 profiles, 4 analysis results.
- **Security blockers:** users can mutate their own quota counters and profile role under the proposed/current policies; analytics inserts are forgeable.
- **QA:** 321/321 unit tests, types, lint, and build pass; Playwright is red (4 failed, 1 passed, 1 skipped).
- **Product/UX:** living-workspace 429 becomes a generic error; mobile hides gaps/score/PRD; P0 smoke cannot pass as written.
- **Decision:** do not reply `APPROVE P0` until the revised checklist in [[03-Sessions/2026-06-21-Claude-P0-Preflight-Review]] is satisfied.

---

## Previous Status — 2026-06-19

### Review board → Roadmap v1.2 + Build Spec v1.0 (planning only; no code changed)

- **🔴 Headline (verified vs live Supabase):** prod is missing `subscriptions`, `usage_counters`, `analysis_events` → PR #17 enforcement + Pro detection + **WAA are silently inert in production.** Real launch readiness **~50/100** (not 58). Fix = apply P0-02 migrations. The "deployed + verified 2026-06-19" claim was tests/tsc/lint only, never a prod data check.
- **Artifacts:** [[Roadmap-2026-06-19-Review-Board|Roadmap v1.2]] (execution source) + [[Build-Spec-v1.0|Build Spec v1.0]] (delivery spec) + [[Beta-Users|private beta CRM]] (Dilya, Radhy, Ben, Handa, Savira).
- **Locked:** PMs-only · store+honest-FAQ · Rp149k · Pro 50/mo hard · light theme · **OpenRouter pivot for MVP** (Anthropic fallback; overrides CLAUDE.md Anthropic-only + OQ-2).
- **NEXT (the one move that lifts readiness):** **apply P0-02** — back up → create the 3 tables (with `metadata jsonb` + `usage_counters` INSERT policy) + auto-profile trigger + backfill 2 users → verify → smoke. Owner-parallel: set OpenRouter key; answer decisions R5–R8.
- See [[03-Sessions/2026-06-19-Review-Board-Roadmap-BuildSpec|session log]].

---

## Previous Status — 2026-06-14

### PR #17 pushed — workspace tier enforcement

Branch `fix/workspace-tier-enforcement` → [PR #17](https://github.com/yukimurakanzaki/Storyforge/pull/17):

- `/api/workspace` now enforces free-tier quota (429 + `X-Limit-Reached` on new session at cap)
- WAA restored: `logAnalysisEvent` `analysis_started` + `analysis_completed` on every turn
- Quota increment on new session success only (continuing an existing session = free + unlimited)
- `FREE_WATERMARK` (OQ-6 copy) rendered in PRD artifact + appended to copied text for free users
- AI timeout: `withTimeout` wraps both model calls — hung upstream can't hold SSE open
- Suite 321/0, `tsc` clean, build green

**Pending before merge:** manual logged-in smoke: free limit → 429; free PRD → watermark; pro PRD → clean.

**Next build:** P0-10 manual payment flow (`design.md` ready). See [[03-Sessions/2026-06-14-Launch-Readiness-Audit]].

---

## Previous Status - 2026-06-10

### Completed This Session - Manual Payment Flow Trade-off Analysis

- Reviewed `.kiro/specs/manual-payment-flow/requirements.md` for the beta manual bank transfer subscription flow.
- Confirmed `.kiro/specs/manual-payment-flow/design.md` is currently empty, so the analysis used the requirements document plus PRD/API architecture context.
- Produced a requirement-by-requirement trade-off analysis covering pricing UX, unique transfer codes, proof upload, admin verification, subscription activation, reminders, grace period, entitlement enforcement, payment records, Bahasa UI, accessibility, privacy, and operational risk.
- Recommended manual transfer for beta, with production-grade security boundaries: private proof storage, server-side entitlement helper, admin-only verification, idempotent approval, dynamic grace-period computation, and append-only payment audit events.
- Recommended keeping the subscription engine gateway-compatible for future Xendit migration.
- **Pending:** convert analysis into `design.md` if the spec is ready to move from requirements to design.

## Previous Status - 2026-06-05

### Completed This Session - Living BRD Workspace Debug + Integration Tests

- **Status update:** Living BRD Workspace Phase 1 remains code-complete on branch `feat/living-brd-workspace`; workspace debug fixes and integration tests are now committed. Logged-in manual smoke is still pending.
- **Fixed workspace persistence 404:** replaced `analysis_results` partial-index `upsert(... onConflict: session_id)` with explicit `INSERT` for new sessions and `UPDATE ... eq(id) ... eq(user_id)` for existing sessions. Also updated `PATCH /api/workspace/gap`.
- **Improved model JSON handling:** added local-only raw response logging, robust first-JSON-object extraction, and stricter prompt instructions so concrete one-sentence requirements produce `new_or_expanded_requirement` gaps instead of empty/general-chat turns.
- **Added `/api/workspace` integration tests:** covers insert/update persistence, new gaps lowering score, parse failure no-persist behavior, severity clamping, and unauthenticated 401.
- **Added Codex-style loading UX:** while Claude is responding, Gaps & Score now shows `Menganalisis` with a subtle pulse and hides the misleading numeric `100`; chat shows a quiet inline pending indicator.
- **Commits created:** `3b1ab67`, `8290b15`, `7ca2e1e`.
- **Verification green:** `npm test` 306/306, `npx tsc --noEmit` exit 0, `npm run lint:anthropic` pass.
- **Pending:** exact logged-in browser-console smoke POST and live raw model inspection in an authenticated local session.

### Completed This Session ✅ (Living BRD Workspace — Phase 1 BUILD)

- **Phase 1 code-complete** on branch `feat/living-brd-workspace`, behind `NEXT_PUBLIC_LIVING_WORKSPACE`. Executed both plans via subagent-driven development (implementer + spec review + code-quality review per task group).
- **Backend (Stories 1–2):** shared types + pure libs (score, reducer, compaction, store w/ legacy fallback, prompts, context-loader); migrations `010_living_workspace` + `011_user_context` applied to Supabase; orchestrator `POST /api/workspace` (one model turn, SSE, `sanitizeTurn` hardening); resume `GET`, panel `PATCH /api/workspace/gap`, `GET/PUT /api/user-context`; "Konteks & Memori" added to `/settings`.
- **Frontend (Stories 3–7):** `useWorkspace` hook + pure client-state; `EmptyState`, `ChatPanel`, `GapsScorePanel`/`GapRow`, `ArtifactPanel`/`PrdArtifact`, `WorkspaceSidebar`, `WorkspaceShell`; `/analyze` is now a flag wrapper (old page preserved byte-for-byte as `LegacyAnalyzeClient`).
- **Owner rules enforced as tests:** no sample/example BRD in the new flow; contrast enforced (no element invisible against its background).
- **Verification green:** tsc clean, `lint:anthropic` pass (key never client-side), **298/298 tests** (50 files), build compiles, old `/analyze` intact with flag off.
- ⏳ **Pending:** manual logged-in smoke (paste→PRD; fintech+S3→SFTP constraint_conflict), then PR/merge. Task F10 (delete legacy path) deferred until default-on.

See [[03-Sessions/2026-06-05-Living-BRD-Workspace-Phase1-Build|full session log]].

### Earlier Session ✅ (GitHub SaaS Repo Research)

- **Production SaaS reference researched** — recommended `KolbySisk/next-supabase-stripe-starter` as the best practical reference for StoryForge because it aligns with Next.js + Supabase + subscriptions + Resend + Vercel.
- **Primary use clarified** — do not replace StoryForge with a starter; use it as a pattern library for billing schema, webhook sync, entitlement checks, account/billing UX, and launch setup.
- **Secondary references noted** — `nextjs/saas-starter` remains the best official general SaaS reference; `vercel/nextjs-subscription-payments` is useful historically but sunset; `antoineross/Hikari` is not primary because it is work-in-progress.

---

## Previous Status - 2026-06-03

### Completed This Session ✅ (Living BRD Workspace — Planning)

- **Epic written** — [[01-Product/Epic-Living-BRD-Workspace|Living BRD Workspace]]. Revamp `/analyze` into a Claude-style living workspace: chat + persistent Gaps & Score panel + living PRD artifact, in a session that auto-compacts so it never maxes out on context. Phase 1 = Stories 1–7; Phase 2 (flowchart, search, starred, projects) = Stories 8–11.
- **Context Layer added** (Story 2) — user profile/memory (industry, role, compliance, tech defaults, standing instructions, PRD template) read before analysis; flags contradictions as `constraint_conflict` gaps (e.g. SFTP vs S3, OJK).
- **Two Phase-1 implementation plans written + self-reviewed:**
  - Backend: `docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1.md` (Tasks 0–15, full TDD).
  - Frontend: `docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1-frontend.md` (Tasks F1–F10).
- **2 schema-dependency bugs caught + fixed in plan** — `brd_text NOT NULL` and the `status` CHECK constraint (now allows `'active'`).
- **Owner requirements baked in as testable criteria** — no sample/example BRD in the new flow; contrast enforced so no button/text disappears into its background.
- ⏳ **Not started:** any application code. Execution pending on branch `feat/living-brd-workspace`.

### Previous Session ✅ (Done-State Completion UX)

- **Done-state completion UX** — fixed the dead-end after "Generate User Stories": in-chat banner, pinned footer CTA, right-panel summary card. PR #14 open on `feat/done-state-completion-ux`.
- Auth-aware CTA: authenticated users see "Lihat Dashboard"; anonymous users see "Daftar untuk simpan riwayat" → `/signup?redirect=/dashboard` (converts the success moment).
- Single primary CTA enforced — only one "Analisis Baru" button on screen at a time (footer owns it).
- Zero-story edge case handled — no false celebration if generation fails.
- Verification green: lint 0 errors, 261/261 tests pass, build compiles, browser DOM proof both auth states.

- ✅ **Animated phone mockups** — 3-phone floating group on BAF + Danamas case study pages (kanbanbot.online style). Live on prod.
- ✅ **Service cards → /contact** — PM Consulting + PM Portfolio Building cards now link to contact page with "Get in touch →" CTA
- ✅ **Dark mode toggle fixed** — Tailwind v4 `@custom-variant dark` added so ThemeToggle actually works
- ✅ **Light mode readability fixed** — Case study prose `@reference` pointed to global.css; text now correctly dark in light mode
- ✅ **All pushed to GitHub + deployed** — `origin/main` tracking set up; production live and tested

---

### Previous Completed ✅

- ✅ **Impeccable design audit + polish** — Score 22→24/40; dark theme fixed, indigo→teal, side-stripe ban, locked card wall collapsed, motion-reduce added, modal focus trap fixed
- ✅ **Refine error recovery fixed** — User message preserved on API failure; error bubble shown in chat instead of silently deleting message
- ✅ **Enter-to-send hint persistent** — Keyboard shortcut always visible below chat input, not just in placeholder
- ✅ **API analyze fixed** — ZDR header gated behind `ANTHROPIC_ZDR_ENABLED=true`; API now works without ZDR enrollment
- ✅ **Result UI fixed** — LivingDocument wrapper changed to `bg-slate-900`; section titles now readable (dark theme components need dark bg)
- ✅ **ESLint flat config migration** — Upgraded ESLint to 9+ and resolved circular reference error
- ✅ **Validation pass green** — `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` all pass on main branch

- ✅ **PRD v1.5 locked** — Production-ready, all features spec'd
- ✅ **API architecture fixed** — Anthropic claude-haiku-4-5 server-side, ZDR header active
- ✅ **Positioning dual segment defined** — PM Indonesia + Vibe Coders
- ✅ **ANTHROPIC_API_KEY in Vercel** — Environment variable added
- ✅ **Validation pass green** — `npm test` and production `next build` both pass
- ✅ **Refine stream null-safe** — analyze page now guards missing `res.body`
- ✅ **Playwright E2E added** — browser smoke coverage now exists for landing to analyze flow
- ✅ **Playwright E2E expanded** — browser coverage now includes refinement and finalize flow
- ✅ **Playwright error path added** — browser coverage now checks refine failure handling
- ✅ **Domain storyforge.id available** — Ready to register
- ✅ **Guest mode activation built** — `/analyze` is public, guests have local quota, and account-gated persistence remains protected
- ✅ **Analyze API hardened** — request validation, `no-store`, and mode headers added
- ✅ **Validation pass green** — `npm test`, Playwright E2E, TypeScript, and production build pass
- ✅ **Guest mode pushed to main** — Commit `249e2ea feat: add bounded guest analysis mode` is on `origin/main`
- ✅ **Magic-link auth flow fixed** — Signup magic link now redirects to `/analyze` after Supabase session exchange, with redirect regression tests added
- ✅ **Output Trust Layer built** — Gap confidence badges, reference text, flag feedback modal, `/api/feedback`, and Supabase migration added
- ✅ **Trust layer validation green** — `npm test`, TypeScript, production build, and Playwright E2E all pass
- ✅ **Awesome Wescoff merge conflict resolved** — Living document/project conflicts resolved from `claude/awesome-wescoff-d9cc26`
- ✅ **Merge verification green** — `npx tsc --noEmit`, `npm test`, and `npm run build` pass after conflict resolution
- ✅ **Password auth conversion** — Signup/login migrated from magic link to email/password
- ✅ **Shared password validation** — `lib/auth/password.ts` shared across signup + set-password
- ✅ **Admin role helper** — `lib/auth/admin.ts` with `getAdminStatus()` for future admin tooling
- ✅ **Profile role migration** — `008_profile_roles.sql` ready for Supabase

### In Progress 🔄

- 🔄 **Apply P0 to prod** — migration 012 + enforcement flip; awaiting `APPROVE P0 PROD`
- 🔄 **Beta CRM** — Dilya, Radhy, Ben, Handa, Savira (see [[04-Launch/Beta-Users|Beta Users]])

### Blocked ⬜ (waiting on P0 going live)

- ⬜ **Tier enforcement + WAA active in prod** — needs migration 012 applied
- ⬜ **P0-04 OAuth allow-list** — Supabase dashboard (PROD-phase owner step)
- ⬜ **P0-06 logged-in prod smoke** — after enforcement flips on
- ⬜ **P0-10 manual payment flow** — `design.md` ready, build after P0 stable
- ⬜ **Beta onboarding** — after enforcement live so quotas actually hold

---

## 🎯 Immediate Next Steps

### The one move that makes launch real — apply P0 to production
P0 enforcement is built + triple-rehearsed locally but **inert in prod** until migration 012
lands. Owner sign-off required: reply **`APPROVE P0 PROD`**. Sequence (from the 2026-06-23 log):
1. Capture prod pre-state snapshot **outside Git** (`C:\Users\USER\storyforge-ops\`).
2. Owner: confirm Supabase backup; deploy new code with `USAGE_ENFORCEMENT_ENABLED=false`.
3. Apply `012_core_saas_enforcement.sql` to prod; run schema/RLS/write-matrix verification.
4. Owner: flip `USAGE_ENFORCEMENT_ENABLED=true`; live smoke (Pro 49/50/51 + free, temp user).
5. Monitor; kill-switch (`=false`) on any failure.

### After P0 is live
- [ ] **P0-04** — Google OAuth allow-list in Supabase dashboard (owner/manual)
- [ ] **P0-06** — logged-in smoke vs prod (free limit → 429; free PRD → watermark; pro PRD → clean)
- [ ] **P0-10** — build manual payment flow (`design.md` ready)
- [ ] OpenRouter provider pivot (decided 2026-06-19; not yet built — code still 100% Anthropic)

---

## 🏗️ Architecture Status

| Component | Status | Notes |
|---|---|---|
| **Frontend** | ✅ Live | Next.js 16 on Vercel, light theme, Living BRD Workspace |
| **API Route** | ✅ Live | `/api/analyze` + `/api/workspace`, Anthropic claude-haiku-4-5, streaming |
| **Auth** | ✅ Live | Email/password + Google OAuth, guest mode |
| **ZDR** | ✅ Gated | Behind `ANTHROPIC_ZDR_ENABLED`; Pro tier sends ZDR header |
| **Domain** | ✅ Live | storyforge.id registered + pointed to Vercel |
| **Supabase (core)** | ✅ Live | Profiles, history, workspace, user-context tables in prod |
| **Supabase (enforcement)** | ⛔ Not in prod | `subscriptions`/`usage_counters`/`analysis_events` — migration 012 pending `APPROVE P0 PROD` |
| **Tier enforcement + WAA** | 🟡 Built, inert in prod | Live once 012 applied + `USAGE_ENFORCEMENT_ENABLED=true` |
| **Payment** | ⏳ Phase 2 | Manual bank transfer (P0-10, design ready), Xendit after |

---

## 💰 Unit Economics (Locked — corrected 2026-06-14 to match PRD v3.0 OQ-1)

| Item | Value |
|---|---|
| Revenue per user/mo | Rp 149.000 (founding beta; 199k post-launch) |
| API cost (50 analyses) | Rp 60.000 |
| Infra (Supabase + Vercel) | Rp 15.000 |
| Payment fee | Rp 0 (manual bank transfer) |
| **Net margin** | **≈ Rp 109.000 (73%)** |
| Break-even users | 5 |
| Target Rp 100jt/year | ≈ 42 Pro users |

> ⚠️ Previously listed Rp 199k / 58% / 84 users — that predated the 2026-06-11 pricing decision (OQ-1). PRD v3.0 is source of truth.

---

## 🎯 Key Decisions (Locked)

1. **API Model:** claude-haiku-4-5 (cost-efficient, structured tasks)
2. **Freemium Boundary:** 3 analyses/month free, 50/month pro
3. **Pro Anchor Feature:** Company Context (persistent, injected into prompt)
4. **North Star Metric:** WAA (Weekly Active Analyzers)
5. **Beta Payment:** Manual bank transfer (Xendit phase 2)
6. **Launch Timeline:** 8 weeks from now (soft launch Week 8)

---

## 📋 Pre-Launch Checklist

| # | Task | Priority | Status |
|---|---|---|---|
| 1 | Register storyforge.id + point to Vercel | 🔴 BLOCKER | ✅ Done |
| 2 | Compliance pages (/privacy, /terms) | 🔴 BLOCKER | ✅ Done |
| 3 | Apply migration 012 to prod (`APPROVE P0 PROD`) | 🔴 BLOCKER | ⬜ Awaiting owner |
| 4 | Flip `USAGE_ENFORCEMENT_ENABLED=true` + live smoke | 🔴 BLOCKER | ⏳ Depends on #3 |
| 5 | P0-04 Google OAuth allow-list | 🟠 Critical | ⏳ PROD phase |
| 6 | Beta onboarding (Dilya, Radhy, Ben, Handa, Savira) | 🟠 Critical | ⏳ Depends on #4 |
| 7 | P0-10 manual payment flow | 🟠 Important | ⏳ Build after P0 stable |
| 8 | OpenRouter pivot / Xendit | 🟡 Nice-to-have | ⏳ Phase 2 |

---

## 🌟 Momentum Check

**What's Working:**
- ✅ API live and tested
- ✅ BRD analysis output correct + format good
- ✅ Streaming UI smooth
- ✅ Zero data retention (privacy) implemented
- ✅ Product-market fit signal from 3/4 PMs willing to pay

**What's Blocking:**
- ⏳ Domain registration (1 day)
- ⏳ Email setup (1 day)
- ⏳ Compliance pages live (1 day)
- ⏳ William onboarding (depends on above 3)

**Timeline Risk:**
- Low — all blockers are mechanical, not technical
- Domain → Email → Compliance → William = 3–4 days max
- Still on track for soft launch Week 8

---

## 📞 Quick Links

- **Product Spec:** [[01-Product/PRD-v1.5|PRD v1.5]]
- **Revenue Model:** [[01-Product/North-Star-Metric|North Star Metric]]
- **Tech Stack:** [[02-Tech/API-Architecture|API Architecture]]
- **Compliance:** [[01-Product/Compliance|Compliance Package]]

---

**Latest Session Log:** [[03-Sessions/2026-06-23-P0-Build-Complete-Local-Rehearsal|2026-06-23: P0 BUILD Complete + Local Rehearsal]]

**Auto-updated by Claude**
