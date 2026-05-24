# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Free User Context Leak
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — authenticated free-tier user with a non-null `projectId` in the request body
  - Test `validateAnalyzePayload` with `{ text: "valid BRD text", projectId: "some-uuid" }` — on unfixed code, the return type has no `projectId` field, confirming the API contract gap (root cause #3)
  - Test that `handleAnalyze` builds a fetch body containing the full `JSON.stringify(selectedProject.context)` string appended to `text` when `selectedProject` is set — on unfixed code this concatenation is unconditional (root cause #2)
  - Test that `POST /api/analyze` with a free-tier authenticated user and a pre-serialized context string in `text` processes the request without any plan check — no `subscriptions.plan` query occurs (root cause #1)
  - Test that `handleProjectSelect` calls `onSelect` immediately for a free-tier user with no paywall check (root cause #4)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found: e.g., `validateAnalyzePayload` returns `{ valid: true, text }` with no `projectId`; fetch body contains `"Project Context:"` string; no `subscriptions` query in route handler
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Request Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `POST /api/analyze` as a guest user returns a valid SSE stream with no project context on unfixed code
  - Observe: `POST /api/analyze` as a free-tier user with `projectId: null` (or absent) returns the same analysis as without any project field
  - Observe: `validateAnalyzePayload({ text: "valid", projectId: undefined })` returns `{ valid: true, text: "valid" }` on unfixed code
  - Observe: usage limit enforcement returns 429 regardless of any extra body fields
  - Write property-based tests: for all requests where `isBugCondition` is false (guest, free user with no project, Pro user with or without project, `projectId: null`), the route behavior is identical to the original
  - Property: generate random `text` strings (within 150k char limit) with `projectId: null` for free-tier users — verify `validateAnalyzePayload` always returns `{ valid: true, text }` without throwing
  - Property: generate random `projectId` values (valid UUIDs, empty string, null, undefined, numbers) — verify `validateAnalyzePayload` never throws and always returns a valid result
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix: move context ownership to server and gate behind Pro plan

  - [x] 3.1 Extend `validateAnalyzePayload` to accept and return `projectId`
    - Update `AnalyzeValidationResult` success branch: `{ valid: true; text: string; projectId: string | null }`
    - After validating `text`, read `(body as { projectId?: unknown }).projectId`
    - Coerce: `null` / `undefined` → `null`; valid non-empty string → trimmed string; any other type (number, empty string, whitespace-only) → `null`
    - Return `{ valid: true, text, projectId: resolvedProjectId }`
    - _Bug_Condition: isBugCondition(X) where X.plan = 'free' AND X.selectedProject IS NOT NULL — the old contract had no `projectId` field, so the server could never gate it_
    - _Expected_Behavior: `validateAnalyzePayload` returns `projectId: string | null` so the POST handler can use it for the plan-gated project fetch_
    - _Preservation: existing `text` validation (missing, empty, oversized) is completely unchanged; `projectId` is optional and does not affect validation of `text`_
    - _Requirements: 2.3, 3.4_

  - [x] 3.2 Add `buildSystemPromptWithContext` helper to `route.ts`
    - Export `function buildSystemPromptWithContext(projectContext?: { name: string; context: ProjectContext }): string`
    - When `projectContext` is `undefined`: return `SYSTEM_PROMPT` unchanged
    - When `projectContext` is provided: return `SYSTEM_PROMPT + "\n\n" + formatted KONTEKS PROJECT block` (name, business description/domain/targetUsers/compliance, technical frontend/backend/existingSystems/constraints — filter out empty fields)
    - Import `ProjectContext` from `@/types`
    - _Bug_Condition: previously the system prompt was always `SYSTEM_PROMPT` with no context injection path on the server_
    - _Expected_Behavior: Pro users with a valid project get context appended to system prompt; all other users get `SYSTEM_PROMPT` unchanged_
    - _Preservation: `SYSTEM_PROMPT` constant is not modified; `buildSystemPromptWithContext(undefined)` === `SYSTEM_PROMPT` exactly_
    - _Requirements: 2.2, 3.1, 3.3_

  - [x] 3.3 Add server-side plan check and project fetch in the `POST` handler
    - After `validateAnalyzePayload` succeeds and inside the `mode === 'user'` branch (after `user` is confirmed and usage check passes), declare `let projectContext: { name: string; context: ProjectContext } | undefined`
    - If `validation.projectId` is non-null and `supabase` is defined: query `subscriptions` table for `plan` where `user_id = user.id`
    - If `plan === 'pro'`: query `projects` table for `name, context` where `id = validation.projectId` (RLS enforced — returns null if not owned by user); if row found, set `projectContext`
    - If `plan === 'free'` or project not found: `projectContext` stays `undefined`
    - Guest mode (`mode === 'guest'`): skip entirely, `projectContext` stays `undefined`
    - _Bug_Condition: isBugCondition(X) where X.plan = 'free' AND X.selectedProject IS NOT NULL — no plan check existed, context leaked_
    - _Expected_Behavior: free users always get `projectContext = undefined`; Pro users get context only if project is found and owned by them (RLS)_
    - _Preservation: guest flow unchanged; usage limit 429 fires before this code runs; RLS enforced silently (no 4xx exposed to client on miss)_
    - _Requirements: 2.1, 2.4, 3.2, 3.5, 3.6_

  - [x] 3.4 Use `buildSystemPromptWithContext` in the Anthropic call
    - Replace `system: SYSTEM_PROMPT` with `system: buildSystemPromptWithContext(projectContext)` in the `anthropic.messages.stream(...)` call
    - No other changes to the Anthropic call (model, max_tokens, temperature, messages array all unchanged)
    - _Bug_Condition: previously `system` was always the bare `SYSTEM_PROMPT` — no server-side context injection existed_
    - _Expected_Behavior: Pro users with a valid project get context in system prompt; all others get base `SYSTEM_PROMPT`_
    - _Preservation: all SSE streaming, `incrementUsage`, `logAnalysisEvent` calls remain unchanged_
    - _Requirements: 2.2, 3.1_

  - [x] 3.5 Remove client-side `projectContextStr` concatenation from `handleAnalyze`
    - Delete the `projectContextStr` variable and its construction from `handleAnalyze`
    - Change fetch body from `{ text: text + projectContextStr }` to `{ text, projectId: selectedProject?.id ?? null }`
    - The `text` field now contains only the raw BRD text — no appended context
    - _Bug_Condition: isBugCondition(X) where X.plan = 'free' AND X.selectedProject IS NOT NULL — client unconditionally appended context to `text`_
    - _Expected_Behavior: client sends clean `text` + `projectId`; server owns all context injection decisions_
    - _Preservation: `text` field content for users without a project is identical to before; `projectId: null` is sent when no project is selected_
    - _Requirements: 2.3, 3.3_

  - [x] 3.6 Add `userPlan` state and fetch plan after auth in `AnalyzePage`
    - Add state: `const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null)`
    - In the existing `supabase.auth.getUser()` effect, after confirming `user` is non-null, query `subscriptions` table: `select('plan').eq('user_id', user.id).single()`
    - Set `setUserPlan((data?.plan as 'free' | 'pro') ?? 'free')`
    - On sign-out (`!session?.user`), reset `setUserPlan(null)`
    - _Requirements: 2.5_

  - [x] 3.7 Add paywall CTA in `handleProjectSelect` for free users
    - Add state: `const [showPaywallCTA, setShowPaywallCTA] = useState(false)`
    - Update `handleProjectSelect`: if `isAuthenticated && (!userPlan || userPlan === 'free')`, call `setShowPaywallCTA(true)` and return early (do NOT call `setSelectedProject` or `setPhase('input')`)
    - Otherwise (Pro user or guest): proceed as before — `setSelectedProject(project); setPhase('input')`
    - Guest users should not reach `handleProjectSelect` (ProjectSelector is only shown to authenticated users), but guard anyway by falling through to the existing behavior
    - _Bug_Condition: isBugCondition(X) where X.plan = 'free' AND X.selectedProject IS NOT NULL — `handleProjectSelect` called `setPhase('input')` unconditionally_
    - _Expected_Behavior: free users see paywall CTA instead of advancing to BRD input_
    - _Preservation: Pro users and the existing `setSelectedProject` + `setPhase('input')` flow are unchanged_
    - _Requirements: 2.5_

  - [x] 3.8 Render paywall CTA in the `select-project` phase
    - In the `select-project` render branch, when `showPaywallCTA` is true, render an inline upgrade banner above or in place of the `ProjectSelector`
    - Banner content (Bahasa Indonesia): explain that Company Context is a Pro feature, include an upgrade CTA button linking to `/pricing` or `/dashboard` (billing section), and a dismiss button that calls `setShowPaywallCTA(false)` to return to the project list
    - When `showPaywallCTA` is false, render `ProjectSelector` as before
    - _Requirements: 2.5_

  - [x] 3.2a Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Free User Context Isolation
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior (no context leak for free users)
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 3.2b Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Request Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm all tests pass
  - Verify: `buildSystemPromptWithContext(undefined)` returns `SYSTEM_PROMPT` unchanged (unit test)
  - Verify: `buildSystemPromptWithContext({ name, context })` returns a string starting with `SYSTEM_PROMPT` and containing `KONTEKS PROJECT: <name>` (unit test)
  - Verify: `validateAnalyzePayload` handles `projectId` as string, null, undefined, number, empty string — always returns `string | null`, never throws (unit test)
  - Verify: `handleProjectSelect` with `userPlan === 'free'` sets `showPaywallCTA = true` and does NOT advance to `'input'` phase (unit test)
  - Verify: `handleAnalyze` fetch body contains `projectId: selectedProject.id` and does NOT contain any `"Project Context:"` string (unit test)
  - Verify: full flow — free user selects project → paywall CTA shown → dismiss → project list shown again (integration test)
  - Verify: full flow — Pro user selects project → `'input'` phase → submits BRD → system prompt contains `KONTEKS PROJECT:` (integration test)
  - Verify: full flow — Pro user submits BRD without project → system prompt equals `SYSTEM_PROMPT` exactly (integration test)
  - Ask the user if any questions arise
