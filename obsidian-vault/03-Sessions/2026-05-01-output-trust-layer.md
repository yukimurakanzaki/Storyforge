# 2026-05-01: Output Trust Layer

**Date:** 2026-05-01
**Status:** Built and verified

---

## Completed Tasks

- Added confidence metadata to `/api/analyze` prompt output contract.
- Added `reference` metadata guidance so the model avoids inventing section references.
- Built `GapItem` UI with confidence badge, reference text, and feedback flag action.
- Added compact feedback modal with three reasons: inaccurate, duplicate, irrelevant.
- Added `/api/feedback` route with auth check, ownership check, validation, and idempotent upsert.
- Added `gap_feedback` Supabase migration tied to canonical `analysis_results`.
- Updated authenticated analysis save flow so feedback can attach to a real saved analysis row.
- Added regression coverage for prompt contract, feedback payload validation, and confidence UI rendering.

## Validation Results

- `npm.cmd test`: 55 tests passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: 4 Playwright tests passed

## Key Decisions

- Feedback references `analysis_results`, not `analysis_history`, because dashboard/history already use `analysis_results`.
- Confidence is separate from severity. Confidence uses trust/evidence labels (`Bukti kuat`, `Perlu dicek`, `Dugaan`) so PMs do not confuse it with business impact.
- Feedback is enabled only when an authenticated analysis has a saved DB id.

## Next Steps

1. Run Supabase migration `005_output_trust_layer.sql` before deploying feedback capture.
2. Test one logged-in analysis in production/staging and confirm `gap_feedback` rows are created.
3. Build the next phase separately: email CTA, return visit card, and re-analyze score diff.

## Files Changed

- `app/api/analyze/route.ts`
- `app/api/feedback/route.ts`
- `app/api/save-session/route.ts`
- `app/(app)/analyze/page.tsx`
- `app/(app)/analyze/[id]/page.tsx`
- `components/analyze/GapItem.tsx`
- `components/analyze/OutputPanel.tsx`
- `lib/feedback.ts`
- `types/index.ts`
- `supabase/migrations/005_output_trust_layer.sql`
- `tests/api/analyze.test.ts`
- `tests/api/feedback.test.ts`
- `e2e/analyze.spec.ts`
