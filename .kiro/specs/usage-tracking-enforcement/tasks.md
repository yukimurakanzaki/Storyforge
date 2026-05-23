# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Usage Enforcement Not Wired Into Analyze Route
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to authenticated free-tier users with usage count ≥ 3 (the concrete failing case)
  - Install `fast-check` as a dev dependency: `npm install -D fast-check`
  - Create test file at `tests/usage-tracking-enforcement.test.ts`
  - Mock Supabase client (`createClient`) to return a fake user and configurable `usage_counters` / `subscriptions` data
  - Mock Anthropic client to return a valid JSON response
  - Test 1: Send authenticated free-tier request with usage count ≥ 3 → assert response is 429 with `X-Limit-Reached: true` header (from Bug Condition: `usageCheckNotCalled`)
  - Test 2: Send authenticated request that succeeds → assert `usage_counters` is incremented (from Bug Condition: `usageIncrementNotCalled`)
  - Test 3: Send authenticated request → assert `analysis_events` receives `analysis_started` and `analysis_completed` rows (from Bug Condition: `analysisEventNotLogged`)
  - Test 4: Assert `FREE_TIER_LIMIT` equals 3 (from Bug Condition: `FREE_TIER_LIMIT != 3`)
  - Test 5: Send request for user with no existing `usage_counters` row → assert row is created via upsert (from Bug Condition: first-time user handling)
  - Use `fc.record()` to generate authenticated user states (count 0–10, plan free/pro) for property: "free-tier users at or above limit always get 429"
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples: `checkUsage` never called, `incrementUsage` never called, `logAnalysisEvent` never called, `FREE_TIER_LIMIT` is 5 not 3
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Guest, Validation, and Error Paths Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **IMPORTANT**: Write these tests BEFORE implementing the fix
  - Observe on UNFIXED code: guest request with `x-guest-mode: 1` → uses in-memory rate limiter, returns 429 when rate exceeded, no Supabase usage calls
  - Observe on UNFIXED code: invalid JSON body → returns 400 with `Invalid JSON` error
  - Observe on UNFIXED code: missing/empty `text` field → returns 400 with `Missing text` error
  - Observe on UNFIXED code: text exceeding 150,000 chars → returns 413 with `BRD text too large` error
  - Observe on UNFIXED code: unauthenticated non-guest request → returns 401 with `Unauthorized` error
  - Observe on UNFIXED code: Anthropic API throws error → returns 500, no usage increment
  - Write property-based tests using `fast-check`:
    - Property: for all guest requests (any valid/invalid payload), response matches in-memory rate limiter behavior and no Supabase usage functions are called
    - Property: for all invalid payloads (generated via `fc.oneof`: missing body, empty text, oversized text, non-string text), response status and error message match observed behavior
    - Property: for all unauthenticated non-guest requests, response is 401
    - Property: for all requests where Anthropic throws, response is 500 and no usage increment occurs
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix usage tracking enforcement

  - [x] 3.1 Fix `FREE_TIER_LIMIT` constant
    - Change `export const FREE_TIER_LIMIT = 5` to `export const FREE_TIER_LIMIT = 3` in `lib/constants.ts`
    - _Bug_Condition: FREE_TIER_LIMIT != 3_
    - _Expected_Behavior: FREE_TIER_LIMIT SHALL be 3 per PRD_
    - _Requirements: 2.4_

  - [x] 3.2 Add upsert logic to `incrementUsage()` in `lib/usage.ts`
    - Replace the UPDATE-only approach with upsert logic
    - If no existing row found (SELECT returns null), INSERT new row with `count: 1`, `first_analysis_at: now()`, `reset_at: now + 30 days`, `updated_at: now()`
    - If row exists, UPDATE with `count: current + 1`, `updated_at: now()`
    - Use Supabase `.upsert()` with `onConflict: 'user_id'` or conditional INSERT/UPDATE pattern
    - _Bug_Condition: incrementUsage does UPDATE on non-existent row → count stays 0_
    - _Expected_Behavior: upsert creates row with count=1 for first-time users_
    - _Preservation: Existing users with rows still get count incremented normally_
    - _Requirements: 2.2, 2.6_

  - [x] 3.3 Wire usage tracking into `/api/analyze/route.ts`
    - Add imports: `import { checkUsage, incrementUsage, logAnalysisEvent } from '@/lib/usage'`
    - Add `import crypto from 'crypto'` (or use `crypto.randomUUID()`)
    - In the authenticated (`else`) branch, after user validation:
      1. Generate `const sessionId = crypto.randomUUID()`
      2. Call `const usageResult = await checkUsage(supabase, user.id)`
      3. If `!usageResult.allowed`, return 429 with `X-Limit-Reached: true` header and JSON body `{ error: 'Limit reached', count: usageResult.count, limit: usageResult.limit, plan: usageResult.plan, mode }`
    - After payload validation, before Anthropic call:
      4. Compute `const wordCount = validation.text.split(/\s+/).length`
      5. Call `await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_started', wordCount)`
      6. Record `const startTime = Date.now()`
    - After successful `JSON.parse(cleaned)`:
      7. Call `await incrementUsage(supabase, user.id)`
      8. Call `await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_completed', wordCount, Date.now() - startTime)`
    - Hoist `supabase` and `user` to outer scope so they're accessible in the try/catch block
    - Ensure `incrementUsage` and `logAnalysisEvent` are NOT called when Anthropic throws (they're after the parse)
    - _Bug_Condition: usageCheckNotCalled AND usageIncrementNotCalled AND analysisEventNotLogged_
    - _Expected_Behavior: checkUsage called before AI, incrementUsage after success, logAnalysisEvent at start and completion_
    - _Preservation: Guest path unchanged (guarded by mode === 'guest' branch), validation errors return before usage check, Anthropic errors don't increment_
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Usage Enforcement Now Active
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `npx vitest --run tests/usage-tracking-enforcement.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Guest, Validation, and Error Paths Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Ensure all exploration tests (Property 1) pass — confirms bug is fixed
  - Ensure all preservation tests (Property 2) pass — confirms no regressions
  - Ensure existing tests (`tests/requirements-markdown.test.ts`) still pass
  - Ask the user if questions arise
