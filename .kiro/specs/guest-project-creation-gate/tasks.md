# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Guest Users See Project Selection UI
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: unauthenticated user on page load and new session trigger
  - Test that when `supabase.auth.getUser()` resolves with no user, the rendered output does NOT contain `ProjectSelector` (from Bug Condition in design: `isBugCondition(input)` where `isAuthenticated === false AND phase === 'select-project'`)
  - Test that when `handleNewSession` is called while `isAuthenticated === false`, phase does NOT become `'select-project'`
  - Test that the "← Pilih project" back button is NOT rendered for guest users in the input phase
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: guests see ProjectSelector)
  - Document counterexamples found (e.g., "Guest page load renders 'Pilih Project' heading", "handleNewSession resets to 'select-project' for guests")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.4, 2.1, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Authenticated User Project Selection Flow
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Authenticated user page load renders `ProjectSelector` with "Pilih Project" heading on unfixed code
  - Observe: `handleNewSession` resets phase to `'select-project'` for authenticated users on unfixed code
  - Observe: Free user selecting a project triggers paywall CTA on unfixed code
  - Observe: Guest analysis flow (rate limiting, account prompt) works from `'input'` phase on unfixed code
  - Write property-based test: for all authenticated user states (free/pro), page load and new session always show `ProjectSelector`
  - Write property-based test: for guest users in `'input'` phase, analysis submission respects rate limiting
  - Verify tests pass on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix guest project creation gate

  - [x] 3.1 Implement the fix in `app/(app)/analyze/page.tsx`
    - In the auth `useEffect` (where `supabase.auth.getUser()` is called), when user is `null`, call `setPhase('input')` to skip project selection for guests
    - In `handleNewSession`, check `isAuthenticated`: if `false`, set phase to `'input'` instead of `'select-project'`
    - In the input phase render block, conditionally hide the "← Pilih project" back button when `!isAuthenticated` (it currently calls `setPhase('select-project')`)
    - _Bug_Condition: isBugCondition(input) where isAuthenticated === false AND (trigger === 'pageLoad' OR trigger === 'newSession') AND phase === 'select-project'_
    - _Expected_Behavior: phase === 'input' for all guest users on page load and new session; ProjectSelector never renders for guests_
    - _Preservation: Authenticated users continue to see ProjectSelector on page load and new session; paywall CTA for Free users; guest rate limiting unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Guest Users Skip Project Selection
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (guests see input form, not ProjectSelector)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Authenticated User Project Selection Flow
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify guest flow: page load → BRD input (no project selection)
  - Verify authenticated flow: page load → project selection → BRD input
  - Verify new session: guest resets to input, authenticated resets to project selection
  - Ask the user if questions arise
