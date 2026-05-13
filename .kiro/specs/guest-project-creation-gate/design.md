# Guest Project Creation Gate Bugfix Design

## Overview

Guest users on the `/analyze` page are incorrectly shown the `ProjectSelector` component (project creation/selection UI) because the `phase` state unconditionally initializes to `'select-project'`. Since projects are a registered-user feature, guests should bypass this phase entirely and land directly on the BRD input form. The fix gates the initial phase value and the `handleNewSession` reset on authentication status, so `ProjectSelector` never renders for unauthenticated users.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a guest (unauthenticated) user visits `/analyze` and the phase is set to `'select-project'`
- **Property (P)**: The desired behavior — guests skip project selection and see the BRD input form directly
- **Preservation**: Existing authenticated-user project selection flow, paywall CTA, and guest analysis features that must remain unchanged
- **AppPhase**: The `phase` state variable in `app/(app)/analyze/page.tsx` that controls which UI is rendered (`'select-project' | 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'`)
- **handleNewSession**: The function in `page.tsx` that resets all state for a fresh session, currently hardcoding phase to `'select-project'`
- **ProjectSelector**: The component in `components/analyze/ProjectSelector.tsx` that renders project list, creation form, and calls `fetchProjects()`

## Bug Details

### Bug Condition

The bug manifests when a guest user (not authenticated) visits the `/analyze` page. The `phase` state initializes to `'select-project'` unconditionally on line 105, and the render block at line ~530 renders `ProjectSelector` whenever `phase === 'select-project'`. This causes guests to see project creation UI that will fail with 401 errors on any interaction.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { isAuthenticated: boolean, phase: AppPhase, trigger: 'pageLoad' | 'newSession' }
  OUTPUT: boolean
  
  RETURN input.isAuthenticated === false
         AND (input.trigger === 'pageLoad' OR input.trigger === 'newSession')
         AND input.phase === 'select-project'
END FUNCTION
```

### Examples

- Guest visits `/analyze` → sees "Pilih Project" heading and "+ Project baru" button (expected: BRD input form)
- Guest clicks "+ Project baru", submits name → 401 error "Gagal membuat project. Coba lagi." (expected: never sees this UI)
- Guest completes an analysis, clicks "Sesi Baru" → `handleNewSession` resets to `'select-project'`, showing project UI again (expected: resets to `'input'`)
- Authenticated user visits `/analyze` → sees ProjectSelector correctly (expected: unchanged)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Authenticated users MUST continue to see `ProjectSelector` with project list and creation options on page load
- Authenticated Pro users selecting a project MUST continue to transition to BRD input with project context
- Authenticated Free users selecting a project MUST continue to see the paywall CTA
- Guest rate limiting (5 analyses) MUST continue to function
- Guest account creation prompt MUST continue to appear after analysis
- The `ProjectSelector` component itself requires no changes — it simply won't be rendered for guests

**Scope:**
All inputs where the user IS authenticated should be completely unaffected by this fix. This includes:
- Authenticated page loads (phase still starts at `'select-project'`)
- Authenticated `handleNewSession` calls (phase still resets to `'select-project'`)
- All project selection, creation, and context flows
- Paywall CTA display for Free users

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Unconditional Phase Initialization**: Line 105 in `page.tsx` sets `useState<AppPhase>('select-project')` with no regard for authentication status. Since the auth check is asynchronous (runs in a `useEffect`), the initial render always shows the project selection phase.

2. **Unconditional Reset in handleNewSession**: The `handleNewSession` function hardcodes `setPhase('select-project')` without checking `isAuthenticated`, so even after the auth state is known, a new session always returns to project selection.

3. **No Auth Guard on Render Block**: The render block at `if (phase === 'select-project')` does not check authentication before rendering `ProjectSelector`.

The primary fix targets items 1 and 2. Item 3 is implicitly resolved because the phase will never be `'select-project'` for guests.

## Correctness Properties

Property 1: Bug Condition - Guest Users Skip Project Selection

_For any_ page load or new session trigger where the user is NOT authenticated, the phase state SHALL be set to `'input'` (never `'select-project'`), ensuring the `ProjectSelector` component is never rendered for guest users.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Authenticated User Project Selection Flow

_For any_ page load or new session trigger where the user IS authenticated, the phase state SHALL be set to `'select-project'`, preserving the existing project selection flow including project list display, project creation, and paywall CTA for Free users.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/(app)/analyze/page.tsx`

**Function**: `AnalyzePage` component

**Specific Changes**:

1. **Conditional Initial Phase**: Change the initial `phase` state from hardcoded `'select-project'` to a value that accounts for auth status. Since auth is async, initialize to `'select-project'` but add a `useEffect` that updates phase to `'input'` once auth resolves as unauthenticated:
   - In the existing `useEffect` that calls `supabase.auth.getUser()`, when the user is `null`, call `setPhase('input')` to skip project selection.
   - In the `onAuthStateChange` handler, when `session?.user` is falsy, also set phase to `'input'` (only if currently at `'select-project'`).

2. **Conditional handleNewSession Reset**: Update `handleNewSession` to check `isAuthenticated` before setting phase:
   - If `isAuthenticated` is `true`: `setPhase('select-project')` (existing behavior)
   - If `isAuthenticated` is `false`: `setPhase('input')` (skip project selection)

3. **Optional: Back Button Guard**: In the `'input'` phase render, the "← Pilih project" back button calls `setPhase('select-project')`. For guests, this button should either not render or navigate differently. Guard it with `isAuthenticated` check.

4. **No Changes to ProjectSelector**: The component itself remains unchanged — it simply won't be rendered for guests because the phase will never be `'select-project'` for them.

5. **No Changes to fetchProjects**: Since `ProjectSelector` won't mount for guests, `fetchProjects()` (called in its `useEffect`) will never execute for unauthenticated users, resolving requirement 2.3.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests that render `AnalyzePage` with mocked Supabase auth returning no user, and assert what phase/UI is displayed. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Guest Page Load Test**: Render page with no authenticated user → assert `ProjectSelector` is NOT rendered (will fail on unfixed code)
2. **Guest New Session Test**: Trigger `handleNewSession` when unauthenticated → assert phase does not become `'select-project'` (will fail on unfixed code)
3. **Guest fetchProjects Not Called**: Render page as guest → assert no call to `/api/projects` (will fail on unfixed code because ProjectSelector mounts)
4. **Guest Back Button Test**: In input phase as guest → assert "← Pilih project" back button is not shown or doesn't navigate to project selection (may fail on unfixed code)

**Expected Counterexamples**:
- `ProjectSelector` renders with "Pilih Project" heading for guest users
- `fetchProjects()` is called and returns 401 error
- Possible causes: unconditional `'select-project'` initialization, no auth guard on phase reset

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderAnalyzePage_fixed(input)
  ASSERT result.phase === 'input'
  ASSERT result.renderedComponent !== 'ProjectSelector'
  ASSERT result.fetchProjectsCalled === false
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderAnalyzePage_original(input) = renderAnalyzePage_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various auth states, plan types, project configurations)
- It catches edge cases that manual unit tests might miss (e.g., auth state transitions mid-session)
- It provides strong guarantees that behavior is unchanged for all authenticated user flows

**Test Plan**: Observe behavior on UNFIXED code first for authenticated users (project selection, paywall, context flow), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Authenticated Page Load Preservation**: Verify authenticated users still see ProjectSelector on page load
2. **Authenticated New Session Preservation**: Verify handleNewSession still resets to 'select-project' for authenticated users
3. **Paywall CTA Preservation**: Verify Free users still see paywall when selecting a project
4. **Guest Analysis Flow Preservation**: Verify guest rate limiting and analysis flow still works from 'input' phase

### Unit Tests

- Test that phase initializes to `'input'` when auth resolves as guest
- Test that phase initializes to `'select-project'` when auth resolves as authenticated
- Test `handleNewSession` sets phase to `'input'` for guests
- Test `handleNewSession` sets phase to `'select-project'` for authenticated users
- Test back button in input phase is hidden/disabled for guests

### Property-Based Tests

- Generate random auth states (guest/free/pro) and verify phase initialization is correct for each
- Generate random session reset sequences and verify phase is always appropriate for auth state
- Generate random user flows and verify ProjectSelector never renders for guests across all scenarios

### Integration Tests

- Test full guest flow: page load → BRD input → analysis → new session → BRD input (never sees project selection)
- Test full authenticated flow: page load → project selection → BRD input → analysis → new session → project selection
- Test auth state transition: guest starts session, logs in mid-flow, new session shows project selection
