# 📋 StoryForge Project Index

**Last Updated:** 2026-06-05 (WIB)
**Status:** Pre-MVP — Living BRD Workspace **Phase 1 code-complete** (backend Stories 1–2 + frontend Stories 3–7) on branch `feat/living-brd-workspace`, behind `NEXT_PUBLIC_LIVING_WORKSPACE`; manual smoke + merge pending

---

## 🚀 Quick Navigation

### Product
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

## Latest Status - 2026-06-05

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

- 🔄 **Run Supabase migrations** — `005_output_trust_layer.sql` + `008_profile_roles.sql`
- 🔄 **Register domain storyforge.id** — Next action
- 🔄 **Setup email forwarding** — privacy@storyforge.id, hello@storyforge.id (via Cloudflare)
- 🔄 **Message William** — Share beta link, reactivate commitment
- 🔄 **Compliance pages** — Publish /privacy, /terms on domain

### Blocked ⬜

- ⬜ **William onboarded** — Waiting for domain + compliance pages
- ⬜ **Beta subdomain setup** — Waiting for domain (beta.storyforge.id)
- ⬜ **Supabase schema migration** — Ready, waiting for domain + email setup
- ⬜ **Soft launch Week 8** — On track if domain done this week
- ⬜ **Server-side guest rate limiting** — Recommended next hardening step

---

## 🎯 Immediate Next Steps (This Week)

### Day 1 (Today — Friday)
- [ ] Register **storyforge.id** (Niagahoster, Rumahweb, or Namecheap)
  - Budget: Rp 200–300k/year
  - Duration: 5–10 minutes
- [ ] Confirm registration & nameserver pointing to Vercel

### Day 2–3 (Weekend)
- [ ] Setup **email forwarding** via Cloudflare
  - `privacy@storyforge.id` → personal email
  - `hello@storyforge.id` → personal email
- [ ] Publish `/privacy` page on Vercel
  - Copy from Compliance-Package-v1.0.docx
  - Point domain to this page
- [ ] Publish `/terms` page on Vercel

### Day 4–5 (Monday–Tuesday)
- [ ] Point custom domain to Vercel
  - Add domain to Vercel project
  - Wait for SSL cert (auto, ~1 min)
- [ ] Message **William**
  - Share beta link: `https://storyforge.id` or `https://app.storyforge.id`
  - Reactivate commitment: "Ready untuk trial next week?"
  - Expected: confirmation + first analysis

### Day 6–7 (Wednesday–Thursday)
- [ ] Backup plan if William unresponsive:
  - Use sample BRD to test full flow
  - Document everything as portfolio artifact
  - Prepare for pitch deck with "live demo"

---

## 🏗️ Architecture Status

| Component | Status | Notes |
|---|---|---|
| **Frontend** | ✅ Live | Next.js on Vercel, guest `/analyze` flow working |
| **API Route** | ✅ Live | `/api/analyze` with Anthropic claude-haiku-4-5, validation, no-store |
| **ZDR Header** | ✅ Configured | Privacy-preserving, no data retention |
| **Supabase** | ⏳ Pending | Schema ready, waiting for go-live signal |
| **Domain** | ⏳ Pending | storyforge.id available, need registration |
| **Email** | ⏳ Pending | Forwarding via Cloudflare, ready to setup |
| **Payment** | ⏳ Phase 2 | Manual bank transfer for beta, Xendit after |

---

## 💰 Unit Economics (Locked)

| Item | Value |
|---|---|
| Revenue per user/mo | Rp 199.000 |
| API cost (50 analyses) | Rp 60.000 |
| Infra (Supabase + Vercel) | Rp 15.000 |
| Payment fee | Rp 8.500 |
| **Net margin** | **Rp 115.500 (58%)** |
| Break-even users | 5 |
| Target Rp 100jt/year | 84 users |

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
| 1 | Register storyforge.id | 🔴 BLOCKER | ⬜ Today |
| 2 | Setup email forwarding | 🔴 BLOCKER | ⏳ Depends on #1 |
| 3 | Publish /privacy page | 🔴 BLOCKER | ⏳ Depends on #1 |
| 4 | Publish /terms page | 🔴 BLOCKER | ⏳ Depends on #1 |
| 5 | Point custom domain to Vercel | 🟠 Critical | ⏳ Depends on #1 |
| 6 | Test William onboarding | 🟠 Critical | ⏳ Depends on #5 |
| 7 | Supabase schema migration | 🟠 Important | ⏳ Ready, trigger after #6 |
| 8 | Xendit integration | 🟡 Nice-to-have | ⏳ Phase 2 |

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

**Session Log:** [[03-Sessions/2026-06-03-Living-BRD-Workspace-Planning|2026-06-03: Living BRD Workspace — Epic & Phase 1 Plans]] — **LATEST**

**Current Session Log:** [[03-Sessions/2026-06-05-GitHub-SaaS-Repo-Research|2026-06-05: GitHub SaaS Repo Research]] — **LATEST**

**Auto-updated by Claude**
