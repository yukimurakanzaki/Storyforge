---
title: "StoryForge.id — Full Product Requirements Document v3.0"
version: 3.0
date: 2026-06-10
owner: Adi (Product Owner)
author: Claude (acting PM)
status: Draft — for Product Owner review
supersedes: [[PRD-v2.0]] (consolidates), [[Epic-Living-BRD-Workspace]] (incorporates)
---

# StoryForge.id — Full Product Requirements v3.0

> **One-line:** StoryForge.id is the **BRD Quality Gate** for Indonesian product teams — an AI-powered living workspace that finds gaps and blindspots in requirements, scores readiness 0–100, and produces a sprint-ready PRD in Bahasa Indonesia.

---

## 1. Problem Statement

Product Managers in Indonesia receive ambiguous, incomplete BRDs from stakeholders, and discover the gaps only **after** the sprint starts — causing rework, delays, and 2–4 wasted hours per sprint per PM. Non-technical founders ("vibe coders") have the mirror problem: they start building from an idea without knowing whether it is complete or viable.

Generic AI chat (ChatGPT/Claude) can critique a document, but it gives no quantitative score, no persistent workspace, no structured gap categories, no Bahasa Indonesia-native stakeholder output — and the chat context eventually maxes out, losing the thread mid-iteration.

**Cost of not solving:** sprint delays, dev rework, founder money burned on building the wrong thing. Evidence: 3 of 4 interviewed Indonesian PMs stated willingness to pay.

---

## 2. Goals

| # | Goal | Type | Measure |
|---|------|------|---------|
| G1 | PMs catch requirement gaps **before** sprint grooming | User | ≥80% analysis completion rate |
| G2 | Establish "score ≥ 80 before grooming" as a team process standard | Business (moat) | Repeat usage: WAA 5 → 20 → 50 over 90 days |
| G3 | Output is directly usable downstream (stakeholder questions in Bahasa Indonesia, PRD pasteable into Cursor/Claude) | User | ≥40% of completed analyses generate a PRD |
| G4 | Convert free users into paying Pro subscribers | Business | ≥1 Pro conversion within 14 days of launch; 15–25% free→Pro over time |
| G5 | Sustainable unit economics from day one | Business | Pro margin ≥70%; break-even at 5 Pro users |

**North Star Metric:** Weekly Active Analyzers (WAA) — unique users running ≥1 analysis per rolling 7 days.

---

## 3. Non-Goals (explicitly out of scope)

1. **Project management / sprint execution** — StoryForge hands off at the PRD. Grooming, tickets, designer handoff, FSD live in downstream tools (Jira/Linear) or separate skills. *Why: scope discipline; the quality gate is the wedge.*
2. **English-first international market** — Bahasa Indonesia first; English is supported but not the wedge. *Why: ID-native output is the differentiator vs ChatPRD/ChatGPT.*
3. **Automated payment (Xendit) at launch** — manual bank transfer for beta. *Why: 5–10 beta payers don't justify gateway integration cost; design stays gateway-compatible.*
4. **Multi-user team workspaces at launch** — Team tier is Phase 4. *Why: prove individual Pro value first.*
5. **Multiple requirements per workspace session** — one session = one living requirement. *Why: keeps the data model and compaction tractable; new requirement = one click.*
6. **Guest mode** — removed in v2.0; all users sign up (Google OAuth ≈ 2 seconds). *Why: WAA/retention tracking requires identity; free tier is generous enough for trial.*

---

## 4. User Segments & Personas

### Persona A — "Rina", PM at an Indonesian fintech (primary, Segment B)
- Receives BRDs from business stakeholders; sprints slip when devs find holes mid-build.
- Needs: gap list with severity, copy-paste clarification questions in Bahasa Indonesia, a defensible score to push back with, and a workspace she can return to as stakeholders answer over days.
- Willingness to pay: **High** (Rp 199k ≪ cost of one delayed sprint).

### Persona B — "Bayu", non-technical founder / vibe coder (Segment A)
- Has an idea, builds with Cursor/Claude Code, discovers missing requirements after building.
- Needs: idea stress-tested, blindspots surfaced, then a structured PRD he can paste straight into his coding agent.
- Willingness to pay: **Medium** (Rp 199k ≪ hiring a PM).

### Persona C — "Admin" (internal, the Product Owner)
- Verifies manual payments, manages beta users, monitors usage and costs.

---

## 5. Product Model — The Living BRD Workspace

The core experience (replacing the old one-shot analyze form, currently code-complete behind the `NEXT_PUBLIC_LIVING_WORKSPACE` flag):

- **One session = one living requirement.** Long-lived, mutable, resumable. Never "locked."
- **Three zones, Claude-style:**
  - **Left sidebar** — New analysis · Recents · (Phase 2: Search, Starred, Projects)
  - **Center chat** — free conversation with the AI; inline "✓ closed question X" notices
  - **Right artifact panel** — tabs: **Gaps & Score** · **PRD** · (Phase 2: Flowchart)
- **Context layer read first:** user profile (industry, role, compliance regimes, tech defaults, standing instructions, PRD template) → project memory (Company Context, Pro) → the requirement. The AI skips questions already answered by known context and raises `constraint_conflict` gaps on contradictions (e.g., "requirement says SFTP but your tech default is S3 — intentional?"; OJK compliance risks flagged).
- **Never maxes out:** the orchestrator persists a compact canonical state (gaps + answers + PRD draft + rolling chat summary) and sends only that to the model — the #1 advantage over raw Claude chat.
- **No sample/example BRD anywhere in the new flow** (owner rule, enforced by tests).
- **Contrast rule:** no UI element may be invisible against its background (owner rule, enforced by tests).

### Core user flow

```
Sign up (Google/email) → /analyze (empty workspace)
  → paste BRD or describe idea in chat
  → AI streams: gaps + clarifying questions + Readiness Score in side panel
  → answer in panel OR in chat (auto-closes matching gaps, score climbs)
  → dismiss what's out-of-scope (recorded in PRD "Assumptions & Out of Scope")
  → "tulis PRD" anytime — open questions become an "Open Questions" section
  → close more gaps later → "update PRD" → version bumps, Open Questions shrinks
  → copy/export PRD → Cursor / stakeholders
  → return any time: session restores fully from sidebar
```

---

## 6. User Stories

### Persona A — PM (Rina)
1. As a PM, I want to paste a stakeholder BRD and get a categorized gap list with severity within 30 seconds, so that I know what's missing before grooming.
2. As a PM, I want clarifying questions in Bahasa Indonesia in copy-paste-ready form, so that I can send them to stakeholders without rewriting.
3. As a PM, I want a Readiness Score (0–100) with clear labels (Siap / Perlu Klarifikasi / Tidak Siap), so that I have an objective gate ("≥80 or it doesn't sprint").
4. As a PM, I want my workspace (chat, gaps, score, PRD) to persist and survive arbitrarily long sessions, so that I never lose the thread when stakeholder answers arrive days later.
5. As a PM, I want to answer a question in chat and have the matching panel item close automatically with a visible notice, so that I don't do double bookkeeping.
6. As a PM, I want to dismiss questions as out-of-scope and still see them recorded in the PRD's Assumptions section, so that deferred decisions stay auditable.
7. As a PM, I want the AI to read my profile (industry, compliance, tech defaults) first, so that it doesn't ask things I've already told it and flags contradictions instead of ignoring them.
8. As a Pro PM, I want persistent Company Context per project, so that every analysis reflects my stack and conventions.
9. As a Pro PM, I want a score trend over time, so that I can show requirement quality improving (and justify the subscription).

### Persona B — Founder (Bayu)
10. As a founder, I want my rough idea challenged for viability gaps and blindspots, so that I don't build the wrong thing.
11. As a founder, I want a structured PRD (epic + INVEST user stories + Gherkin acceptance criteria) I can paste into Cursor/Claude, so that my coding agent has a real spec.
12. As a free user, I want 3 free analyses per month with visible usage ("2/3 analisis bulan ini"), so that I can evaluate before paying.

### Persona C — Admin
13. As an admin, I want to verify manual transfer proofs and activate subscriptions idempotently in <24h, so that beta payments work without a gateway.
14. As an admin, I want payment events recorded append-only, so that disputes are auditable.

### Edge cases
15. As a user with an empty profile, I want analysis to work exactly as before (graceful degradation), so that onboarding has no required setup.
16. As a user whose chat answer is ambiguous, I want the gap to stay open with a focused follow-up question, so that nothing is falsely closed.
17. As a user at my monthly limit, I want a clear (non-hostile) upgrade CTA instead of a dead end.
18. As a user returning to a legacy (pre-workspace) session, I want it to open correctly in the new workspace via the migration adapter.

---

## 7. Requirements

### 7.1 Must-Have — P0 (cannot launch without)

| ID | Requirement | Acceptance criteria (summary) | Status |
|----|-------------|-------------------------------|--------|
| P0-1 | **Auth: signup required** (Google OAuth + email/password); no guest mode | Given an unauthenticated visitor, when they open /analyze, then they are routed to signup; signup ≤ 2 steps | ✅ Built (password auth shipped 2026-05-10) |
| P0-2 | **Gap analysis engine** — 5 categories (Business Context, Functional, Non-Functional, User & Role, Edge Cases) + severity + confidence + BRD reference quote | Given a pasted BRD, when analysis runs, then a structured gap list streams in <30s P95 | ✅ Built |
| P0-3 | **Readiness Score 0–100** — ≥80 Siap (green), 50–79 Perlu Klarifikasi (yellow), <50 Tidak Siap (red); recomputed live as gaps close | Closing (answer or dismiss) any gap raises the score; thresholds match existing `score-utils` logic | ✅ Built |
| P0-4 | **Clarification questions** in Bahasa Indonesia, copy-paste ready, grouped by category | Output renders with one-click copy | ✅ Built |
| P0-5 | **Living workspace** (Epic Stories 1–7): orchestrator `POST /api/workspace` with 4-intent routing, auto-compaction, Gaps & Score panel, chat↔panel sync, living PRD artifact, sidebar + resume + legacy adapter, behind `NEXT_PUBLIC_LIVING_WORKSPACE` | Epic DoD: full happy path E2E; >16-turn session loses no gap/PRD content; flag off = old page intact | ✅ Code-complete on `feat/living-brd-workspace` — ⏳ manual logged-in smoke + merge pending |
| P0-6 | **Context layer** — `user_context` (industry, role, compliance[], tech_defaults, standing_instructions, prd_template) merged user→project→session; `constraint_conflict` gaps; "Konteks & Memori" in /settings | Fintech+S3 profile + SFTP requirement ⇒ `constraint_conflict` gap; empty profile ⇒ today's behavior | ✅ Code-complete (same branch) |
| P0-7 | **PRD generation** — epic + INVEST user stories + Gherkin AC; on demand even with open questions ("Open Questions" section); re-sync bumps `prd_version`; honors `prd_template` | Generate → close gaps → "update PRD" → Open Questions shrinks; copy/export works | ✅ Code-complete (same branch) |
| P0-8 | **Security: API key server-side only** — `ANTHROPIC_API_KEY` from `process.env` only; all model calls via server routes; SSE streaming; ≤200k tokens/analysis | `lint:anthropic` passes; no client import of the key (CI-enforced) | ✅ Enforced |
| P0-9 | **Tier enforcement server-side** — Free: 3 analyses/mo, 5k-word BRD, watermark, 5-history cap; Pro: 50/mo, 10k words, no watermark; usage counter visible in header | Limits enforced in API routes (not client); counter accurate; at-limit shows upgrade CTA | ⚠️ Partially built — server-side enforcement + watermark to verify |
| P0-10 | **Manual payment flow (beta)** — per `.kiro/specs/manual-payment-flow/requirements.md`: upgrade CTA → transfer instructions with unique code → proof upload (private storage) → admin verification (admin-only, idempotent approval) → 30-day activation → H-3 reminder email → 3-day grace period → server-side entitlement helper → append-only payment audit events | Each step per spec; entitlement checked server-side on every gated action | ⏳ Spec'd (requirements done, design.md pending) — **next build item** |
| P0-11 | **Compliance pages live** — /privacy + /terms on domain; UU PDP: right to erasure, consent, data minimization; ZDR header on Anthropic calls (gated by `ANTHROPIC_ZDR_ENABLED`); RLS on all Supabase tables | Pages reachable on storyforge.id; account deletion works | ⏳ Pages drafted; blocked on domain |
| P0-12 | **Domain + email** — storyforge.id registered, pointed at Vercel; privacy@/hello@ forwarding via Cloudflare | Site serves on the domain with SSL | ⏳ **Launch blocker — register now** |
| P0-13 | **Landing page** — conversion-focused, Bahasa Indonesia, "Mulai Gratis" CTA, Free/Pro comparison | Signup rate ≥30% of landing visitors | ✅ Built (copy review pending) |

### 7.2 Nice-to-Have — P1 (fast follow, weeks 1–4 after launch)

| ID | Requirement | Notes |
|----|-------------|-------|
| P1-1 | Retention emails (Resend): welcome, 3-day inactive, usage-limit-approaching, payment H-3 reminder | H-3 reminder is part of P0-10's spec; the rest are P1 |
| P1-2 | Score trend chart (Pro) — readiness over time per project | The "show value over time" churn mitigation |
| P1-3 | Saved clarifications library (Pro) | |
| P1-4 | Export PRD to Markdown/PDF (Pro) | Copy already exists; file export is P1 |
| P1-5 | Phase 2 workspace: session search, starred sessions, Projects + Company Context in sidebar (Epic Stories 9–11) | |
| P1-6 | Tiered AI models — Free on Gemini 2.0 Flash (~Rp 15/user/mo), Pro on Claude Haiku 4.5 + ZDR | Makes free tier sustainable; decision locked in v2.0, implementation pending |
| P1-7 | Free-tier auto-cleanup (5 history max, 30 days) | |
| P1-8 | Admin dashboard — WAA, revenue, payment verification queue | Minimal verification UI is P0-10; the dashboard is P1 |

### 7.3 Future Considerations — P2 (design for, don't build)

| ID | Requirement | Architectural implication now |
|----|-------------|------------------------------|
| P2-1 | Xendit auto-billing (VA/QRIS, auto-renewal, dunning) | Subscription engine must be **gateway-agnostic**: activation/expiry/grace logic independent of payment method (locked in 2026-06-10 trade-off analysis) |
| P2-2 | Team tier (Rp 149k/seat, min 3): shared projects, team score dashboard, seat admin | Keep `user_id` scoping clean so an `org_id` layer can be added |
| P2-3 | Flowchart tab (Mermaid, Epic Story 8) | `flow_chart` column already exists |
| P2-4 | Referral system (+1 free analysis per invite) | |
| P2-5 | Jira/Linear integration; public API; enterprise tier | PRD output already structured for ticket templates |

---

## 8. Pricing & Unit Economics

**Beta pricing (decided 2026-06-11):** Pro **Rp 149.000/bln** as "Harga Founding Member" (locked forever for beta users) + **Rp 399.000/3 bulan** package (fewer manual payment cycles). Public-launch price target: Rp 199k, set after real willingness-to-pay data. Manual transfer = zero payment fee → margin at 149k ≈ Rp 109k/user (73%); break-even ~5 Pro users.

| | Free | Pro — Rp 149k/mo beta (199k post-launch) | Team — Rp 149k/seat/mo (P2) |
|---|---|---|---|
| Analyses/month | 3 | 50 | 100/seat |
| BRD length | 5k words | 10k words | 15k words |
| Watermark | Yes | No | No |
| PRD generation | Basic | Full | Full + priority |
| Company Context | — | 1 project | Unlimited |
| History | 5 max / 30 days | Unlimited / 90 days | Unlimited / 1 year |
| Score trend, saved clarifications, export | — | ✅ | ✅ |

**Economics:** Pro margin ≈ Rp 150k/user/mo (76% with tiered models). Break-even: **5 Pro users**. Target Rp 100jt/year ≈ 42 Pro users.

> ⚠️ Open pricing question — see OQ-1 below (Rp 199k vs Rp 149k discrepancy between docs).

---

## 9. Tech Stack & Constraints (reference)

Next.js App Router + Tailwind on Vercel · Supabase (Auth, Postgres + RLS, Storage) · Anthropic claude-haiku-4-5 server-side with ZDR (Pro) · Gemini 2.0 Flash (Free, P1-6) · SSE streaming · Upstash QStash · Resend · Manual transfer → Xendit (P2).

**Hard rules (CLAUDE.md):** API key never client-side · all model calls through server routes · max 200k tokens/analysis · UI in Bahasa Indonesia, code/comments in English · no sample BRD in the workspace flow · contrast rule enforced.

---

## 10. Success Metrics

### Leading (days–weeks post-launch)
| Metric | Success | Stretch | Measured via |
|---|---|---|---|
| WAA week 1 | 5 | 8 | Supabase `analysis_events` |
| Signup rate (landing → account) | 30% | 45% | Vercel Analytics |
| Analysis completion rate | 80% | 90% | `analysis_events` |
| PRD generation rate | 40% of completed | 60% | `analysis_results.prd_version > 0` |
| P95 analysis time | <30s | <20s | `analysis_events.duration_ms` |
| Payment verification turnaround | <24h | <6h | payment audit events |

### Lagging (30–90 days)
| Metric | Success | Stretch |
|---|---|---|
| WAA 30 days | 20 | 30 |
| WAA 90 days | 100 | 150 |
| First Pro conversion | within 14 days | within 7 days |
| Free → Pro conversion | 15% | 25% |
| Monthly churn | <10% | <5% |
| NPS (beta) | ≥40 | ≥60 |

---

## 11. Open Questions — ALL RESOLVED 2026-06-11

| # | Question | Decision |
|---|----------|----------|
| OQ-1 | Pro price 199k vs 149k? | ✅ **Rp 149k/bln beta founding price + Rp 399k/3-bulan package**; raise to 199k at public launch. Price kept in one config constant. |
| OQ-2 | Switch free tier to Gemini before launch? | ✅ **No — launch with Claude Haiku as built.** Cost difference negligible under ~100 free users; revisit at P1-6. |
| OQ-3 | Flag default-on + legacy /analyze deletion? | ✅ **Flag on at merge after smoke test; delete legacy path at merge** (no active users → no risk; Task F10 un-deferred). |
| OQ-4 | Write payment design.md? | ✅ **Done** — `.kiro/specs/manual-payment-flow/design.md` (2026-06-11), full design incl. data model, routes, entitlements, security checklist, 3 build phases. |
| OQ-5 | Personal bank account OK? | ✅ **Personal BCA, BCA only** (Mandiri dropped). Unique-amount code (Rp 149.XXX) since personal accounts can't issue VAs. Report income in personal SPT. |
| OQ-6 | Watermark copy? | ✅ Quiet footer line on free output: `— Dibuat dengan StoryForge.id (Gratis) · storyforge.id` + in-app upgrade note. No content overlay. |

---

## 12. Timeline & Phasing

**Hard constraint:** soft launch target = Week 8 of the current plan; domain registration is the critical-path blocker for everything external.

| Phase | Window | Contents |
|---|---|---|
| **Phase 0 — Unblock (this week)** | Now | Register storyforge.id → Cloudflare email → publish /privacy + /terms → point domain at Vercel |
| **Phase 1 — Workspace live** | This week | Manual logged-in smoke test of the living workspace → PR → merge → flag on. Run pending Supabase migrations (`005`, `008`) |
| **Phase 2 — Monetize** | Next 1–2 weeks | Resolve OQ-1 + OQ-4 → build manual payment flow (P0-10) → verify tier enforcement + watermark (P0-9) |
| **Phase 3 — Beta launch** | Week 8 | Onboard William + PM A–D → first paid conversion → retention emails (P1-1) |
| **Phase 4 — Retention & growth** | Weeks 9–12 | Score trend, saved clarifications, export, Phase-2 workspace stories, tiered models |
| **Phase 5 — Scale** | Month 4+ | Xendit, Team tier, referrals, integrations |

**Dependencies:** William onboarding ← domain + compliance pages. Payment build ← OQ-1 pricing decision. Tier enforcement verification ← workspace merge (so limits are checked on the new endpoint too).

---

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| API cost abuse | High | Server-side usage caps on `/api/workspace` (verify P0-9 covers the new endpoint) |
| Low free→Pro conversion | High | Generous free tier + score trend showing accumulated value + watermark nudge |
| Manual payment friction | Medium | Clear instructions, unique transfer codes, <24h verification, H-3 reminder, 3-day grace |
| Single beta user (William) unresponsive | Medium | Backup: PM A–D list; self-demo with own BRDs as portfolio artifact |
| ChatGPT/Claude "good enough" | Medium | Score + persistence + ID-native output + quality-gate process; living workspace never maxes out |
| Solo-founder bus factor / burnout | Medium | Everything documented in vault; scope ruthlessly held to P0 |
| Data leak | Low | RLS everywhere, ZDR, private proof storage, UU PDP deletion |

---

## 14. Related Documents

- [[PRD-v2.0]] — strategy + pricing detail (consolidated here)
- [[Epic-Living-BRD-Workspace]] — full workspace stories + architecture
- [[North-Star-Metric]] — WAA deep dive
- [[Compliance]] — privacy/ToS/UU PDP package
- [[02-Tech/API-Architecture]] · [[02-Tech/Database-Schema]]
- `.kiro/specs/manual-payment-flow/requirements.md` — payment spec
- [[03-Sessions/2026-06-10-manual-payment-flow-tradeoff-analysis]] — payment trade-offs

---

**Changelog v3.0:** consolidates PRD v2.0 strategy with the Living BRD Workspace epic (now the core P0 experience), incorporates the manual-payment-flow spec and 2026-06-10 trade-off decisions, restates all requirements with build status as of 2026-06-10, surfaces the Rp 199k/149k pricing conflict as a blocking open question, and re-phases the launch plan around the actual remaining work (domain → workspace merge → payment → beta).
