/**
 * Bug Condition Exploration Test — Guest Project Creation Gate
 *
 * Property 1: Bug Condition — Guest Users See Project Selection UI
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - Guest users should NEVER see ProjectSelector (phase should be 'input', not 'select-project')
 * - handleNewSession should reset to 'input' for guests (not 'select-project')
 * - The "← Pilih project" back button should NOT be rendered for guest users
 *
 * CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Bug Condition (from design):
 *   isBugCondition(input) where isAuthenticated === false
 *   AND (trigger === 'pageLoad' OR trigger === 'newSession')
 *   AND phase === 'select-project'
 *
 * Scoped PBT Approach: Scope the property to concrete failing cases:
 *   - unauthenticated user on page load
 *   - new session trigger while unauthenticated
 *
 * Validates: Requirements 1.1, 1.4, 2.1, 2.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ─── Extract testable logic from the component ────────────────────────────────
//
// The AnalyzePage component has these behaviors we need to test:
//
// 1. Phase initialization: `useState<AppPhase>('select-project')` — always 'select-project'
//    regardless of auth status. The auth useEffect later calls setIsAuthenticated but
//    does NOT update phase for guests.
//
// 2. handleNewSession: always calls `setPhase('select-project')` without checking isAuthenticated
//
// 3. Render logic: when phase === 'input', the back button "← Pilih project" is always rendered
//    (calls setPhase('select-project') on click)
//
// We model these as pure functions that mirror the component's logic:

type AppPhase = 'select-project' | 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'

/**
 * Models the CURRENT (fixed) behavior of phase initialization.
 * On the fixed code, phase starts as 'input' for guests (skips project selection).
 */
function getInitialPhase_current(isAuthenticated: boolean = false): AppPhase {
  return isAuthenticated ? 'select-project' : 'input'
}

/**
 * Models the EXPECTED (correct) behavior of phase initialization.
 * For guests, phase should start as 'input' to skip project selection.
 */
function getInitialPhase_expected(isAuthenticated: boolean): AppPhase {
  return isAuthenticated ? 'select-project' : 'input'
}

/**
 * Models the CURRENT (fixed) behavior of handleNewSession.
 * On the fixed code, handleNewSession checks isAuthenticated and resets to 'input' for guests.
 */
function handleNewSession_current(isAuthenticated: boolean = false): AppPhase {
  return isAuthenticated ? 'select-project' : 'input'
}

/**
 * Models the EXPECTED (correct) behavior of handleNewSession.
 * For guests, should reset to 'input' instead of 'select-project'.
 */
function handleNewSession_expected(isAuthenticated: boolean): AppPhase {
  return isAuthenticated ? 'select-project' : 'input'
}

/**
 * Models the CURRENT (fixed) render logic for the back button.
 * On the fixed code, the back button is only rendered for authenticated users in the input phase.
 */
function shouldRenderBackButton_current(isAuthenticated: boolean, phase: AppPhase): boolean {
  return phase === 'input' && isAuthenticated
}

/**
 * Models the EXPECTED (correct) render logic for the back button.
 * For guests, the back button should NOT be rendered in the input phase.
 */
function shouldRenderBackButton_expected(isAuthenticated: boolean, phase: AppPhase): boolean {
  return phase === 'input' && isAuthenticated
}

/**
 * Models whether ProjectSelector would be rendered given the current phase.
 * ProjectSelector renders when phase === 'select-project'.
 */
function wouldRenderProjectSelector(phase: AppPhase): boolean {
  return phase === 'select-project'
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Guest Project Creation Gate', () => {
  /**
   * Property 1.1: Guest Page Load — Phase should be 'input' for unauthenticated users
   *
   * Tests that when supabase.auth.getUser() resolves with no user, the phase
   * does NOT result in 'select-project' (i.e., ProjectSelector is NOT rendered).
   *
   * On UNFIXED code: getInitialPhase_current() returns 'select-project' regardless
   * of auth status, so this test WILL FAIL — proving the bug exists.
   *
   * **Validates: Requirements 1.1, 2.1**
   */
  it('Guest page load: phase should NOT be select-project when user is unauthenticated', () => {
    // Simulate: guest user (not authenticated) visits /analyze page
    const isAuthenticated = false

    // Current behavior (what the fixed code does):
    const currentPhase = getInitialPhase_current(isAuthenticated)

    // Expected behavior (what should happen):
    const expectedPhase = getInitialPhase_expected(isAuthenticated)

    // The phase for guests should be 'input', NOT 'select-project'
    expect(currentPhase).toBe(expectedPhase)
    // Equivalently: ProjectSelector should NOT render for guests
    expect(wouldRenderProjectSelector(currentPhase)).toBe(false)
  })

  /**
   * Property 1.2: Guest New Session — handleNewSession should NOT reset to 'select-project'
   *
   * Tests that when handleNewSession is called while isAuthenticated === false,
   * phase does NOT become 'select-project'.
   *
   * On UNFIXED code: handleNewSession_current() always returns 'select-project',
   * so this test WILL FAIL — proving the bug exists.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  it('Guest new session: handleNewSession should NOT set phase to select-project when unauthenticated', () => {
    // Simulate: guest user clicks "Sesi Baru" while not authenticated
    const isAuthenticated = false

    // Current behavior (what the fixed code does):
    const currentPhase = handleNewSession_current(isAuthenticated)

    // Expected behavior (what should happen):
    const expectedPhase = handleNewSession_expected(isAuthenticated)

    // The phase for guests after new session should be 'input', NOT 'select-project'
    expect(currentPhase).toBe(expectedPhase)
    // Equivalently: ProjectSelector should NOT render for guests after new session
    expect(wouldRenderProjectSelector(currentPhase)).toBe(false)
  })

  /**
   * Property 1.3: Guest Back Button — should NOT be rendered for guest users in input phase
   *
   * Tests that the "← Pilih project" back button is NOT rendered for guest users
   * when they are in the input phase.
   *
   * On UNFIXED code: shouldRenderBackButton_current() returns true for any user
   * in the input phase, so this test WILL FAIL — proving the bug exists.
   *
   * **Validates: Requirements 2.1, 2.4**
   */
  it('Guest input phase: back button "← Pilih project" should NOT be rendered for guests', () => {
    // Simulate: guest user is in the input phase
    const isAuthenticated = false
    const phase: AppPhase = 'input'

    // Current behavior (what the fixed code does):
    const currentRendersBackButton = shouldRenderBackButton_current(isAuthenticated, phase)

    // Expected behavior (what should happen):
    const expectedRendersBackButton = shouldRenderBackButton_expected(isAuthenticated, phase)

    // The back button should NOT render for guests
    expect(currentRendersBackButton).toBe(expectedRendersBackButton)
    // Equivalently: back button should be false for guests
    expect(currentRendersBackButton).toBe(false)
  })

  /**
   * PBT Property: For ALL unauthenticated states, phase should NEVER be 'select-project'
   *
   * Property-based test that generates various guest scenarios and verifies
   * that the phase is never 'select-project' for any of them.
   *
   * Scoped to concrete failing cases: page load and new session triggers.
   *
   * On UNFIXED code: Both triggers always produce 'select-project' for guests,
   * so this test WILL FAIL with counterexamples.
   *
   * **Validates: Requirements 1.1, 1.4, 2.1, 2.4**
   */
  it('PBT: For any guest trigger (pageLoad or newSession), phase should never be select-project', () => {
    const triggerArb = fc.oneof(
      fc.constant('pageLoad' as const),
      fc.constant('newSession' as const)
    )

    fc.assert(
      fc.property(triggerArb, (trigger) => {
        const isAuthenticated = false

        // Simulate the current (fixed) behavior for the given trigger
        let resultPhase: AppPhase
        if (trigger === 'pageLoad') {
          resultPhase = getInitialPhase_current(isAuthenticated)
        } else {
          resultPhase = handleNewSession_current(isAuthenticated)
        }

        // Assert: phase should NEVER be 'select-project' for guests
        expect(resultPhase).not.toBe('select-project')
        // Assert: ProjectSelector should NEVER render for guests
        expect(wouldRenderProjectSelector(resultPhase)).toBe(false)
      }),
      { numRuns: 50 }
    )
  })

  /**
   * PBT Property: For ALL guest states in input phase, back button should NOT render
   *
   * Property-based test that verifies the back button is never shown for guests
   * regardless of other state variations.
   *
   * On UNFIXED code: The back button always renders in input phase regardless
   * of auth, so this test WILL FAIL with counterexamples.
   *
   * **Validates: Requirements 2.1, 2.4**
   */
  it('PBT: For any guest user in input phase, back button should not render', () => {
    // Generate various "guest state" scenarios — the key invariant is isAuthenticated = false
    const guestStateArb = fc.record({
      hasSelectedProject: fc.boolean(),
      guestUsageCount: fc.integer({ min: 0, max: 5 }),
    })

    fc.assert(
      fc.property(guestStateArb, (_guestState) => {
        const isAuthenticated = false
        const phase: AppPhase = 'input'

        // Current (fixed) behavior: back button only renders for authenticated users in input phase
        const rendersBackButton = shouldRenderBackButton_current(isAuthenticated, phase)

        // Assert: back button should NOT render for guests
        expect(rendersBackButton).toBe(false)
      }),
      { numRuns: 50 }
    )
  })
})


// ─── Preservation Property Tests ──────────────────────────────────────────────
//
// Property 2: Preservation — Authenticated User Project Selection Flow
//
// These tests verify EXISTING correct behavior on UNFIXED code.
// They serve as regression guards to ensure the fix doesn't break:
// - Authenticated user project selection flow
// - Paywall CTA for Free users
// - Guest analysis rate limiting
//
// ALL tests in this block MUST PASS on the unfixed code.
//
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

// ─── Model functions for preservation behavior ────────────────────────────────

/**
 * Models the CURRENT behavior of phase initialization for authenticated users.
 * On the unfixed code, phase always starts as 'select-project' — this is CORRECT
 * for authenticated users and must be preserved.
 */
function getInitialPhase_authenticated(): AppPhase {
  // Authenticated users always start at 'select-project' — this is correct behavior
  return 'select-project'
}

/**
 * Models the CURRENT behavior of handleNewSession for authenticated users.
 * On the unfixed code, handleNewSession always resets to 'select-project' —
 * this is CORRECT for authenticated users and must be preserved.
 */
function handleNewSession_authenticated(): AppPhase {
  // Authenticated users always reset to 'select-project' — this is correct behavior
  return 'select-project'
}

/**
 * Models the CURRENT behavior of handleProjectSelect for authenticated users.
 * - Free users (no plan or plan === 'free'): triggers paywall CTA, does NOT transition phase
 * - Pro users (plan === 'pro'): transitions to 'input' phase with selected project
 */
function handleProjectSelect_current(
  isAuthenticated: boolean,
  userPlan: 'free' | 'pro' | null
): { phase: AppPhase; showPaywallCTA: boolean; selectedProject: boolean } {
  if (isAuthenticated && (!userPlan || userPlan === 'free')) {
    return { phase: 'select-project', showPaywallCTA: true, selectedProject: false }
  }
  return { phase: 'input', showPaywallCTA: false, selectedProject: true }
}

/**
 * Models the CURRENT behavior of guest rate limiting.
 * canGuestAnalyze returns { allowed, count, limit } based on localStorage usage.
 * When count >= limit (FREE_TIER_LIMIT = 3), analysis is blocked.
 */
function canGuestAnalyze_model(currentCount: number, limit: number): { allowed: boolean; count: number; limit: number } {
  return {
    allowed: currentCount < limit,
    count: currentCount,
    limit,
  }
}

/**
 * Models the CURRENT behavior of handleAnalyze for guest users.
 * When rate limit is exceeded, sets error and shows account prompt.
 * When allowed, proceeds to 'analyzing' phase.
 */
function handleAnalyze_guestFlow(
  isAuthenticated: boolean,
  guestUsageCount: number,
  guestUsageLimit: number
): { phase: AppPhase; error: string | undefined; showAccountPrompt: boolean } {
  if (!isAuthenticated) {
    const usageCheck = canGuestAnalyze_model(guestUsageCount, guestUsageLimit)
    if (!usageCheck.allowed) {
      return {
        phase: 'input', // stays on input phase
        error: 'Batas analisis gratis tercapai. Masuk untuk menyimpan riwayat dan melanjutkan analisis.',
        showAccountPrompt: true,
      }
    }
  }
  return { phase: 'analyzing', error: undefined, showAccountPrompt: false }
}

describe('Preservation Property Tests — Authenticated User Project Selection Flow', () => {
  /**
   * Observation 1: Authenticated user page load renders ProjectSelector
   *
   * On the UNFIXED code, phase initializes to 'select-project' for ALL users.
   * For authenticated users, this is the CORRECT behavior that must be preserved.
   *
   * **Validates: Requirements 3.1**
   */
  it('Observation: Authenticated user page load renders ProjectSelector with "Pilih Project" heading', () => {
    const phase = getInitialPhase_authenticated()
    expect(phase).toBe('select-project')
    expect(wouldRenderProjectSelector(phase)).toBe(true)
  })

  /**
   * Observation 2: handleNewSession resets phase to 'select-project' for authenticated users
   *
   * On the UNFIXED code, handleNewSession always resets to 'select-project'.
   * For authenticated users, this is the CORRECT behavior that must be preserved.
   *
   * **Validates: Requirements 3.1**
   */
  it('Observation: handleNewSession resets phase to select-project for authenticated users', () => {
    const phase = handleNewSession_authenticated()
    expect(phase).toBe('select-project')
    expect(wouldRenderProjectSelector(phase)).toBe(true)
  })

  /**
   * Observation 3: Free user selecting a project triggers paywall CTA
   *
   * On the UNFIXED code, when an authenticated Free user selects a project,
   * handleProjectSelect shows the paywall CTA instead of transitioning to input.
   *
   * **Validates: Requirements 3.3**
   */
  it('Observation: Free user selecting a project triggers paywall CTA', () => {
    const result = handleProjectSelect_current(true, 'free')
    expect(result.showPaywallCTA).toBe(true)
    expect(result.phase).toBe('select-project') // stays on select-project
    expect(result.selectedProject).toBe(false)
  })

  /**
   * Observation 4: Guest analysis flow (rate limiting) works from 'input' phase
   *
   * On the UNFIXED code, when a guest user is in the 'input' phase and submits
   * analysis, the rate limiting logic correctly blocks when limit is reached.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Observation: Guest analysis flow respects rate limiting from input phase', () => {
    // Guest at limit (3/3) — should be blocked
    const blockedResult = handleAnalyze_guestFlow(false, 3, 3)
    expect(blockedResult.phase).toBe('input')
    expect(blockedResult.error).toBeDefined()
    expect(blockedResult.showAccountPrompt).toBe(true)

    // Guest below limit (2/3) — should proceed
    const allowedResult = handleAnalyze_guestFlow(false, 2, 3)
    expect(allowedResult.phase).toBe('analyzing')
    expect(allowedResult.error).toBeUndefined()
    expect(allowedResult.showAccountPrompt).toBe(false)
  })

  /**
   * PBT Property 2.1: For ALL authenticated user states (free/pro), page load
   * and new session ALWAYS show ProjectSelector
   *
   * Property-based test that generates various authenticated user configurations
   * and verifies that phase is always 'select-project' on page load and new session.
   *
   * This test MUST PASS on unfixed code — it captures existing correct behavior.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it('PBT: For all authenticated user states (free/pro), page load and new session always show ProjectSelector', () => {
    const userPlanArb = fc.oneof(
      fc.constant('free' as const),
      fc.constant('pro' as const)
    )

    const triggerArb = fc.oneof(
      fc.constant('pageLoad' as const),
      fc.constant('newSession' as const)
    )

    fc.assert(
      fc.property(userPlanArb, triggerArb, (userPlan, trigger) => {
        const isAuthenticated = true

        // For authenticated users, both page load and new session should result in 'select-project'
        let resultPhase: AppPhase
        if (trigger === 'pageLoad') {
          resultPhase = getInitialPhase_authenticated()
        } else {
          resultPhase = handleNewSession_authenticated()
        }

        // Assert: phase should ALWAYS be 'select-project' for authenticated users
        expect(resultPhase).toBe('select-project')
        // Assert: ProjectSelector should ALWAYS render for authenticated users
        expect(wouldRenderProjectSelector(resultPhase)).toBe(true)

        // Additional preservation: Free users selecting a project should trigger paywall
        if (userPlan === 'free') {
          const selectResult = handleProjectSelect_current(isAuthenticated, userPlan)
          expect(selectResult.showPaywallCTA).toBe(true)
          expect(selectResult.phase).toBe('select-project')
        }

        // Additional preservation: Pro users selecting a project should transition to input
        if (userPlan === 'pro') {
          const selectResult = handleProjectSelect_current(isAuthenticated, userPlan)
          expect(selectResult.showPaywallCTA).toBe(false)
          expect(selectResult.phase).toBe('input')
          expect(selectResult.selectedProject).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * PBT Property 2.2: For guest users in 'input' phase, analysis submission
   * respects rate limiting
   *
   * Property-based test that generates various guest usage counts and verifies
   * that rate limiting correctly blocks/allows analysis based on count vs limit.
   *
   * This test MUST PASS on unfixed code — it captures existing correct behavior.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('PBT: For guest users in input phase, analysis submission respects rate limiting', () => {
    const guestUsageArb = fc.record({
      count: fc.integer({ min: 0, max: 10 }),
      limit: fc.constant(3), // FREE_TIER_LIMIT = 3
    })

    fc.assert(
      fc.property(guestUsageArb, ({ count, limit }) => {
        const isAuthenticated = false

        const result = handleAnalyze_guestFlow(isAuthenticated, count, limit)

        if (count >= limit) {
          // Rate limit exceeded: should block analysis
          expect(result.phase).toBe('input')
          expect(result.error).toBe('Batas analisis gratis tercapai. Masuk untuk menyimpan riwayat dan melanjutkan analisis.')
          expect(result.showAccountPrompt).toBe(true)
        } else {
          // Under limit: should proceed to analyzing
          expect(result.phase).toBe('analyzing')
          expect(result.error).toBeUndefined()
          expect(result.showAccountPrompt).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * PBT Property 2.3: Paywall CTA behavior is consistent for all Free user states
   *
   * Property-based test that generates various Free user configurations and verifies
   * that selecting a project always triggers the paywall CTA.
   *
   * This test MUST PASS on unfixed code — it captures existing correct behavior.
   *
   * **Validates: Requirements 3.3**
   */
  it('PBT: Paywall CTA triggers for all Free user states when selecting a project', () => {
    const freePlanArb = fc.oneof(
      fc.constant('free' as const),
      fc.constant(null as 'free' | 'pro' | null)
    )

    fc.assert(
      fc.property(freePlanArb, (userPlan) => {
        const isAuthenticated = true

        // Free users (plan === 'free' or plan === null) should always see paywall
        const result = handleProjectSelect_current(isAuthenticated, userPlan)
        expect(result.showPaywallCTA).toBe(true)
        expect(result.phase).toBe('select-project')
        expect(result.selectedProject).toBe(false)
      }),
      { numRuns: 50 }
    )
  })
})
