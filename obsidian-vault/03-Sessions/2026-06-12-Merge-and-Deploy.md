# Session: Merge feat/living-brd-workspace → main + Deploy

**Date:** 2026-06-12
**Branch:** main (merged from feat/living-brd-workspace)
**Status:** Completed — workspace live on main, pushed to GitHub/Vercel

## Goal

Merge the smoke-tested Living BRD Workspace branch to main, remove the feature flag gate, delete the legacy analyze client, and push to production.

## What Was Done

1. **Removed feature flag gate** from `app/(app)/analyze/page.tsx` — `WorkspaceShell` is now always rendered; no more `NEXT_PUBLIC_LIVING_WORKSPACE` check needed.
2. **Deleted `LegacyAnalyzeClient.tsx`** — the old one-shot analyze form. No other file imported it.
3. **Kept `app/(app)/analyze/[id]/page.tsx`** — still useful as a read-only view of old analysis sessions.
4. **Kept `app/api/analyze/route.ts`** — has extensive test coverage and serves the `[id]` history view.
5. Verified: `npx tsc --noEmit` clean, `npx vitest run` → **311/311 pass**.
6. **Committed** all workspace branch changes (normalize-prd fix, prompt fix, requirements doc, payment design, session logs).
7. **Merged** `feat/living-brd-workspace` → `main` with `--no-ff` merge commit.
8. **Pulled** remote main (6 commits ahead) then **pushed** — Vercel deployment triggered.

## Files Changed

- `app/(app)/analyze/page.tsx` — flag gate removed, always WorkspaceShell
- `app/(app)/analyze/LegacyAnalyzeClient.tsx` — deleted
- `obsidian-vault/00-Index.md` — status updated

## Current State

- `main` is now the workspace build — deployed to Vercel
- `NEXT_PUBLIC_LIVING_WORKSPACE` env var is no longer read by code (can be removed from Vercel if desired)
- 311/311 tests pass, build clean

## Next Session

1. **Register `storyforge.id` domain** — unblocked (software verified working)
2. **Set up email** (Resend + domain)
3. **Build manual payment flow Phase A** — design doc at `.kiro/specs/manual-payment-flow/design.md`
   - Migration `012_manual_payments.sql`
   - `/api/payment/intent`, `/api/payment/proof`, `/api/payment/status`
   - `/api/admin/payments` + approve/reject (idempotent)
   - `getEntitlements()` wired into `/api/workspace`
   - Confirmation + rejection emails via Resend
