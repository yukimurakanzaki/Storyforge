# PRD v1.5 → v2.0 Reconciliation
**Date:** 2026-05-12
**Status:** Draft — for brainstorming

---

## Part A: Fix the PRD (reconcile spec vs reality)

### What the PRD says vs what's actually built

| PRD v1.5 Feature | Spec | Built | Gap |
|---|---|---|---|
| Magic link auth | Only magic link | Email/password + hidden admin magic link | ⚠️ Spec wrong |
| profiles.role | Not mentioned | ✅ Built (migration 008) | 🆕 Not in spec |
| analysis_results extra columns | Not mentioned | ✅ project_id, sections, section_states, requirement_version, session_state (migration 006) | 🆕 Not in spec |
| analyze_sessions table | Not mentioned | ✅ Built (migration 003) — messages, current_analysis, artifact | 🆕 Not in spec |
| gap_feedback table | Not mentioned | ✅ Built (migration 005) — per-gap feedback | 🆕 Not in spec |
| Projects table | Not mentioned | ✅ Built (migration 006) — with design_md, design_md_source | 🆕 Not in spec |
| Living Document 8 sections | Not in spec | ✅ Built — foundation, roles, flow, engineer, designer, qa, templates, stakeholder | 🆕 Not in spec |
| /api/requirements endpoint | "PRD Draft" as output format | ✅ Built as separate POST endpoint | 🆕 Not spec'd as API |
| Refinement chat | "Clarification questions" as static output | ✅ Interactive Q&A chat + iterative refine | 🆕 Not in spec |
| Xendit subscription | Phase 2 payment | ❌ Not built | 🟡 Pending |
| Resend email hooks | Retention emails | ❌ Not built | 🟡 Pending |
| Score trend chart | Pro feature | ❌ Not built | 🟡 Pending |
| Watermark on free output | Listed | ❌ Not built | 🟡 Pending |
| BRD word limit 5k/10k | Hard limit | ⚠️ UI-level check only, not DB-enforced | 🟡 Partial |
| RLS on all tables | Listed | ⚠️ Done on core tables, analyze_sessions done, projects done, gap_feedback done | ✅ Done |

### New things built that need to be added to PRD

1. **`profiles.role`** — user/admin role system (admin magic link path exists)
2. **`projects` table** — project-based context with optional design_md (uploaded or generated)
3. **`analyze_sessions`** — canonical session store for the Living Document UX
4. **`gap_feedback`** — per-gap feedback (inaccurate/duplicate/irrelevant) with confidence tracking
5. **8-section Living Document** — foundation, roles, flow, engineer, designer, qa, templates, stakeholder
6. **Refinement chat** — iterative Q&A with message history stored in analyze_sessions
7. **Requirements generation** — separate /api/requirements endpoint producing INVEST user stories + Gherkin scenarios
8. **Project selector** — project-level context injection into BRD analysis

---

## Part B: New Feature Planning (v2.0)

### What's still pending from v1.5

- **Xendit subscription integration** — Rp 199k/mo
- **Resend email hooks** — retention, grace period notifications
- **Score trend chart** — Pro feature showing score history
- **Output watermark** — Free tier watermark on gap list / PRD draft
- **BRD word limit enforcement** — DB-level or at least consistent UI

### Natural v2.0 extensions (from what we built)

1. **DESIGN.md generation** — user uploads wireframe/mockup, AI generates design_md spec (projects.design_md_source = 'generated')
2. **Multi-BRD project** — group multiple analyses under one project, see evolution over time
3. **Stakeholder share link** — generate a read-only share of the Living Document for non-users
4. **Gap confidence feedback loop** — use gap_feedback data to improve analysis prompt
5. **PRD export** — downloadable .md or .pdf of the Living Document
6. **Team workspace** — invite team members to a project (beyond just individual auth)

### Open questions for brainstorming

1. **Payment gate** — Is the Xendit integration the top priority? Or is there a simpler interim step?
2. **Design feature** — Is the DESIGN.md generation worth building before payment? It's a differentiator.
3. **Share/collaboration** — Real need or premature? PMs often share via screenshot anyway.
4. **Pro tier upgrades** — Are current free users converting? Any signal on conversion rate?
5. **Mobile UX** — Analyze page works on mobile but Living Document sections are very desktop-focused.
6. **Language** — PRD says "Bahasa Indonesia + English" for output. Is bilingual important or just ID?