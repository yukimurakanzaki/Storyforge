# Session: Manual Payment Flow Trade-off Analysis
**Date:** 2026-06-10
**Branch:** not checked
**Status:** Completed

## What Was Done

Reviewed the Kiro requirements for `manual-payment-flow` and produced a full trade-off analysis for the beta manual bank transfer payment system.

Source files reviewed:
- `.kiro/specs/manual-payment-flow/requirements.md`
- `.kiro/specs/manual-payment-flow/.config.kiro`
- `.kiro/specs/manual-payment-flow/design.md` (empty)
- `obsidian-vault/00-Index.md`
- `obsidian-vault/01-Product/PRD-v1.5.md`
- `obsidian-vault/02-Tech/API-Architecture.md`
- latest prior session log

## Key Analysis Conclusions

- Manual BCA/Mandiri transfer is the right beta choice because it minimizes launch complexity and supports early willingness-to-pay validation.
- The main costs are manual admin workload, slower activation, proof-of-transfer privacy risk, and more subscription edge cases.
- The payment implementation should be intentionally beta-grade operationally but production-grade for security, entitlement enforcement, admin authorization, and auditability.
- The subscription engine should be reusable for future Xendit integration.

## Recommended Design Decisions

- Use private Supabase Storage paths for transfer proofs, not public proof image URLs.
- Centralize entitlement checks in a server-side helper used by all gated routes.
- Compute subscription status dynamically from `expires_at` plus the 3-day grace period rather than relying only on scheduled downgrades.
- Use an append-only `payment_events` audit table alongside the current `manual_payments` row.
- Make admin approval idempotent.
- Use generated transfer codes in the `001-999` range and expire pending instructions through `expires_at`.
- Treat renewal while active as an extension from the current expiry, not always 30 days from verification time.
- Add admin notification when proof is uploaded.

## Pending Follow-up

- Convert the trade-off analysis into `design.md` if the manual payment spec is ready to move from requirements into design.
- Decide whether to implement in phases:
  1. Pricing, instructions, upload, admin approve/reject, activation.
  2. Expiry reminders, grace banner, admin history filters.
  3. Xendit migration using the same subscription engine.

## Verification

No code was changed and no tests were run. This was an analysis/documentation session.
