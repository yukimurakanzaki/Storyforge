# Database Schema — Supabase

**Last Updated:** 2026-06-24
**Source of truth:** `supabase/migrations/*.sql` in the repo (this note is a plain-language map).

> ⚠️ **Prod gap (the launch blocker):** the live database is **missing** `subscriptions`,
> `usage_counters`, and `analysis_events`. They are declared in `001_initial_schema.sql` but
> were never applied to production. Migration **`012_core_saas_enforcement.sql`** re-creates
> them safely (idempotent + corrected security) and is what `APPROVE P0 PROD` will apply.

---

## Tables (what actually exists in migrations)

| Table | Purpose | Created in | Notes |
|---|---|---|---|
| `profiles` | One row per user (name, role) | 001 | `role` added in 008; role-lockdown hardened in 012 |
| `analysis_results` | **Main history** — every BRD analysis + its living PRD | 002 | Extended by 009 (v2 fields), 010 (living workspace: `gaps`, `prd`, `title`, `starred`, `flow_chart`…), 006 (`project_id`) |
| `analyze_sessions` | Older chat-session model | 003 | Legacy; living workspace now lives on `analysis_results` |
| `gap_feedback` | "This gap is wrong/duplicate/irrelevant" feedback | 005 | Output Trust Layer |
| `user_context` | Pro user memory (industry, role, compliance, tech defaults, standing instructions, PRD template) | 011 | Injected into the prompt; powers `constraint_conflict` gaps |
| `subscriptions` | Plan (`free`/`pro`) + status + period | 001 → **012** | ⛔ missing in prod until 012 applied |
| `usage_counters` | Rolling quota count per user | 001 → **012** | ⛔ missing in prod; powers Free 3/mo + Pro 50/mo cap |
| `analysis_events` | **WAA tracking** — `analysis_started` / `analysis_completed` (+ `metadata jsonb`) | 001 → **012** | ⛔ missing in prod; North Star metric is inert without it |

**Not built** (listed in old CLAUDE.md but never created): `company_context`, `saved_clarifications`.
Company-context functionality lives in `user_context` instead.

---

## Security model (post-P0)

- **Server-authoritative writes.** All quota/subscription/event writes go through the service
  role (`createServiceClient()`). Clients can only **read their own** rows.
- This closed the P0 hole where users could self-promote to Pro, reset their own quota, or
  forge analytics. RLS in 012 is read-own-only; grants revoke TRUNCATE/DELETE from `authenticated`.
- Auto-provision trigger creates `profiles` + `subscriptions` + `usage_counters` rows on signup.

## Rollout switch

`USAGE_ENFORCEMENT_ENABLED` (env). Default ON. Set to `"false"` to **measure-only** (counters
log, analytics fire, but the cap never blocks) — used for safe burn-in before flipping enforcement on.

## Related
- [[02-Tech/API-Architecture|API Architecture]]
- [[01-Product/Build-Spec-v1.0|Build Spec v1.0]] — DB/API contracts + quota rules
- [[03-Sessions/2026-06-23-P0-Build-Complete-Local-Rehearsal|P0 BUILD log]]
