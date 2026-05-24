# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - ZDR Header Missing from Anthropic Client
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: The bug is deterministic — scope the property to the concrete case: any `new Anthropic()` call without `defaultHeaders['anthropic-beta'] = 'zdr-2025-01-01'`
  - Create `lib/__tests__/anthropic.test.ts` using Vitest
  - Mock `@anthropic-ai/sdk` constructor via `vi.mock`
  - Test that importing `{ anthropic }` from `@/lib/anthropic` results in a client constructed with `defaultHeaders` containing `'anthropic-beta': 'zdr-2025-01-01'`
  - Run test on UNFIXED code — module does not exist yet, so import will fail
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists: no shared client with ZDR header)
  - Document counterexample: `lib/anthropic.ts` does not exist; routes use `new Anthropic({ apiKey })` without `defaultHeaders`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Route Behavior Unchanged After Client Swap
  - **IMPORTANT**: Follow observation-first methodology
  - Create `app/api/__tests__/routes-preservation.test.ts` using Vitest
  - Mock `@anthropic-ai/sdk` at module level to capture constructor args and return canned responses
  - Observe on UNFIXED code: `/api/analyze` returns structured JSON with gapList, readinessScore for valid input
  - Observe on UNFIXED code: `/api/refine` returns message + readyToFinalize + analysis for valid conversation
  - Observe on UNFIXED code: `/api/requirements` returns userStories JSON for valid input
  - Observe on UNFIXED code: unauthenticated requests return 401
  - Observe on UNFIXED code: rate-limited guest requests return 429
  - Write property tests asserting these observed behaviors hold for any valid/invalid input combination
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for ZDR header compliance

  - [x] 3.1 Create shared Anthropic client module (`lib/anthropic.ts`)
    - Export `anthropic` instance configured with `defaultHeaders: { 'anthropic-beta': 'zdr-2025-01-01' }`
    - Read `apiKey` from `process.env.ANTHROPIC_API_KEY`
    - Export `Anthropic` type re-export for `TextBlock` type guard usage in routes
    - _Bug_Condition: isBugCondition(input) where input.defaultHeaders does NOT contain 'anthropic-beta: zdr-2025-01-01'_
    - _Expected_Behavior: anthropic client has defaultHeaders['anthropic-beta'] = 'zdr-2025-01-01'_
    - _Preservation: No route logic changes — only client instantiation moves_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Refactor `/api/analyze/route.ts` to use shared client
    - Remove `import Anthropic from '@anthropic-ai/sdk'`
    - Remove `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
    - Add `import { anthropic } from '@/lib/anthropic'` and `import type Anthropic from '@anthropic-ai/sdk'`
    - Replace `client.messages.create(...)` → `anthropic.messages.create(...)`
    - _Bug_Condition: route no longer instantiates its own client without ZDR header_
    - _Preservation: All auth, validation, response format, error handling unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.3 Refactor `/api/refine/route.ts` to use shared client
    - Remove `import Anthropic from '@anthropic-ai/sdk'`
    - Remove `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
    - Add `import { anthropic } from '@/lib/anthropic'` and `import type Anthropic from '@anthropic-ai/sdk'`
    - Replace `client.messages.create(...)` → `anthropic.messages.create(...)`
    - _Bug_Condition: route no longer instantiates its own client without ZDR header_
    - _Preservation: All auth, validation, response format, error handling unchanged_
    - _Requirements: 2.1, 3.2_

  - [x] 3.4 Refactor `/api/requirements/route.ts` to use shared client
    - Remove `import Anthropic from '@anthropic-ai/sdk'`
    - Remove `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
    - Add `import { anthropic } from '@/lib/anthropic'` and `import type Anthropic from '@anthropic-ai/sdk'`
    - Replace `client.messages.create(...)` → `anthropic.messages.create(...)`
    - _Bug_Condition: route no longer instantiates its own client without ZDR header_
    - _Preservation: All auth, validation, response format, error handling unchanged_
    - _Requirements: 2.1, 3.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - ZDR Header Present on Shared Client
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `lib/__tests__/anthropic.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — shared client has ZDR header)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Route Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run `app/api/__tests__/routes-preservation.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — all routes behave identically)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Write static analysis guard against direct Anthropic instantiation in routes
  - Create `scripts/check-no-direct-anthropic.sh` (or add to existing lint script)
  - Grep all `app/api/**/*.ts` files for `new Anthropic(` — should find zero matches
  - If matches found, fail with descriptive error message pointing to `lib/anthropic.ts`
  - This prevents future developers from bypassing the shared client
  - _Requirements: 2.2_

- [x] 5. Create API Architecture documentation
  - Create `obsidian-vault/02-Tech/API-Architecture.md`
  - Document the shared `lib/anthropic.ts` pattern and why it exists
  - Document ZDR header requirement and compliance rationale
  - Document the rule: "Never instantiate Anthropic directly in route files"
  - Reference PRD v1.5 compliance claims
  - _Requirements: 2.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Run static analysis guard: `bash scripts/check-no-direct-anthropic.sh`
  - Verify no TypeScript errors: `npx tsc --noEmit`
  - Ensure all tests pass, ask the user if questions arise.
