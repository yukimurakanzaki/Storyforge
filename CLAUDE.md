# CLAUDE.md — StoryForge Build Context

**READ THIS FIRST EVERY SESSION**

> StoryForge.id — "From idea to buildable PRD — in minutes."
> The owner is a **solo, non-technical product owner.** Always explain in plain
> language and **end every session with a clear "What to do next" guide.**

---

## Project Status (current — 2026-06-24)

- ✅ Core product live: BRD → gap analysis → readiness score → PRD (Living BRD Workspace)
- ✅ API live on Anthropic claude-haiku-4-5 (server-side only), streaming, ZDR-ready
- ✅ Auth (email/password + Google OAuth), guest mode, history, settings, deployed on Vercel
- ✅ **P0 "Stop-the-Bleed" enforcement BUILT + triple-rehearsed locally** on branch
  `fix/workspace-tier-enforcement` — tier limits, WAA logging, watermark, kill-switch flag.
  Migration `012_core_saas_enforcement.sql` ready.
- ⛔ **NOT in production yet** — P0 awaits explicit owner sign-off: reply **`APPROVE P0 PROD`**.
- ⏳ Next builds after P0: manual payment flow (P0-10), OpenRouter provider pivot.

> ⚠️ **Production gap:** live Supabase is still missing `subscriptions`, `usage_counters`,
> `analysis_events`. Until migration 012 is applied to prod, tier enforcement + WAA are
> **silently inert in production.** Applying 012 is the one move that makes launch real.

---

## Product Vision

AI tool that challenges a business idea / BRD, finds gaps and blindspots, and generates a
ready-to-build PRD. Output in Bahasa Indonesia + English.

## Target User (MVP — PMs-only)

**Product Managers Indonesia** (locked 2026-06-19; Vibe Coder segment deferred post-MVP).

- Input: BRD from stakeholder
- Pain: BRD is ambiguous/incomplete → sprint delays
- Output: gap list + clarification questions + readiness score + PRD draft

## Core Engine

- Gap analysis & blindspot detection
- Clarification questions (Bahasa Indonesia, copy-paste ready)
- Readiness Score 0-100
- PRD generation (Bahasa + English)

## Analysis Output Format

1. **Gap List** — Business Context, Functional, Non-Functional, User & Role, Edge Cases
2. **Clarification Questions** — Bahasa Indonesia, copy-paste ready
3. **Readiness Score** — 0-100 (80-100 Siap · 50-79 Perlu Klarifikasi · 0-49 Tidak Siap)
4. **PRD Draft** — structured, ready to paste into Claude/Cursor

---

## Stack

- Frontend: Next.js 16 App Router + Tailwind + Vercel — **light theme** (locked)
- Auth + DB: Supabase
- AI: **Anthropic claude-haiku-4-5** — server-side only (OpenRouter pivot planned, not yet built)
- Payment: Manual bank transfer (beta), Xendit post-beta
- Email: Resend

## Critical Rules

- NEVER expose `ANTHROPIC_API_KEY` (or any provider key) to the client
- NEVER ask the user to input their own API key
- ALL AI calls go through server routes (`/api/analyze`, `/api/workspace`) only
- Stream via Server-Sent Events; max 200k tokens per analysis
- **AI writes are server-authoritative** (service role). Clients read-own-only; quota/role/
  analytics are NOT client-writable (this was the security hole P0 closed).

## Environment Variables

- `ANTHROPIC_API_KEY`, `ANTHROPIC_ZDR_ENABLED`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `USAGE_ENFORCEMENT_ENABLED` — P0 kill-switch. Default ON; set to `"false"` to
  measure-only (counters log, never block). Losing the var fails toward enforcing.

## Supabase Tables

Existing: `analysis_results`/`analysis_history`, `company_context`, `saved_clarifications`,
`profiles`, living-workspace + user-context tables.
**Added in migration 012 (enforcement):** `subscriptions`, `usage_counters`, `analysis_events`.

## Pricing (OQ-1, locked 2026-06-11)

- **Free:** 3 analyses/month, max 5 history, watermark
- **Pro:** **Rp 149k/month** founding beta (Rp 199k post-launch) — 50 analyses (hard cap),
  Company Context, 90-day history, PRD export

## North Star Metric

**WAA — Weekly Active Analyzers** (unique users with ≥1 analysis per rolling 7 days).

## Language

UI: Bahasa Indonesia · Code: English · Comments: English

---

## Obsidian Vault Integration

**Vault path:** `C:\Users\USER\Storyforge\obsidian-vault\`

**Read at session start (for context):**
1. `obsidian-vault/00-Index.md` — current status + navigation hub
2. `obsidian-vault/01-Product/Roadmap-2026-06-19-Review-Board.md` — **execution source** (P0…P4)
3. `obsidian-vault/01-Product/Build-Spec-v1.0.md` — delivery spec (journeys, copy, contracts, DoD)
4. Most recent log in `obsidian-vault/03-Sessions/`

**At end of EVERY session:**
1. Write session log to `obsidian-vault/03-Sessions/[DATE]-[TOPIC].md`
2. Update `00-Index.md` with latest status
3. Reference existing decisions via `[[links]]`
4. Git commit is manual (owner does it at milestones)

---

## Current Priority

1. **Owner decision:** apply P0 to production (`APPROVE P0 PROD`) — back up → deploy code with
   `USAGE_ENFORCEMENT_ENABLED=false` → apply migration 012 → verify → flip enforcement on →
   live smoke. Kill-switch to `false` on any failure.
2. Then: P0-04 Google OAuth allow-list (Supabase dashboard) + P0-06 logged-in smoke.
3. Then build: manual payment flow (P0-10), OpenRouter provider pivot.

---

**Always end your work with a plain-language "What to do next" for a non-technical owner.**
