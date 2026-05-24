# Pro-Gate Company Context Bugfix Design

## Overview

Company Context (project context) is the primary Pro-tier differentiator in StoryForge.id's freemium model. The bug has two dimensions:

1. **Missing gate check** — any authenticated user can select a project and have its context influence the analysis, regardless of subscription plan. Free users receive a Pro feature for free.
2. **Wrong injection location** — context is concatenated into the BRD `text` field on the client side (`handleAnalyze` in `page.tsx`) rather than being injected into the system prompt on the server side. This degrades context quality even for Pro users, because user-message injection is less effective than system-prompt injection.

The fix is surgical: move context ownership entirely to the server, gate it behind a `plan === 'pro'` check, and add a paywall CTA on the client for free users who attempt to use the feature.

**Files changed:**
- `app/api/analyze/route.ts` — accept `projectId`, check plan, inject into system prompt
- `app/(app)/analyze/page.tsx` — remove client-side context concatenation, send `projectId`, add paywall CTA

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the leak — a free-tier authenticated user has a project selected when submitting a BRD, causing project context to be injected into the analysis without a plan check.
- **Property (P)**: The desired behavior when the bug condition holds — the system SHALL ignore project context entirely for free users and SHALL NOT include it in either the system prompt or the user message.
- **Preservation**: All existing behaviors for Pro users without a project, guest users, free users without a project, and the existing `validateAnalyzePayload` logic must remain unchanged.
- **`handleAnalyze`**: The async function in `app/(app)/analyze/page.tsx` that builds the fetch request to `/api/analyze`. Currently concatenates `projectContextStr` into the `text` body field.
- **`SYSTEM_PROMPT`**: The exported constant in `app/api/analyze/route.ts` containing the base Indonesian BRD analyst prompt. The fix appends a `KONTEKS PROJECT:` section to this when a Pro user provides a valid `projectId`.
- **`buildSystemPromptWithContext`**: New helper function to be added to `route.ts` that returns `SYSTEM_PROMPT` unchanged when no context is provided, or `SYSTEM_PROMPT + "\n\n" + formatted context block` when a Pro user's project is found.
- **`subscriptions.plan`**: The `plan` column in the Supabase `subscriptions` table, queried server-side after auth to determine whether project context should be applied. Values: `'free'` | `'pro'`.
- **`projects` table**: Supabase table with RLS policy `"Users can manage their own projects"` — `auth.uid() = user_id`. The server-side authenticated Supabase client enforces this automatically.
- **`selectedProject`**: The `Project | null` state in `AnalyzePage`. Currently used to build `projectContextStr`. After the fix, only its `.id` is sent to the server.

---

## Bug Details

### Bug Condition

The bug manifests when an authenticated free-tier user selects a project and submits a BRD. The `handleAnalyze` function in `page.tsx` unconditionally builds `projectContextStr` from `selectedProject.context` and appends it to the `text` field — no plan check occurs anywhere in the client-to-server flow. The `/api/analyze` route never receives a `projectId` and never queries `subscriptions.plan`, so it has no opportunity to gate the feature.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type { user: AuthUser | null, plan: 'free' | 'pro', selectedProject: Project | null }
  OUTPUT: boolean

  // Bug fires when a free user has a project selected — context leaks into analysis
  RETURN X.selectedProject IS NOT NULL
         AND X.plan = 'free'
         AND X.user IS NOT NULL
END FUNCTION
```

### Examples

- **Free user, project selected**: User on free plan selects "Invoice Module" project, submits BRD → `projectContextStr` is appended to `text`, full `ProjectContext` JSON reaches Claude. **Expected**: context ignored, analysis proceeds on BRD text only.
- **Free user, no project**: User on free plan skips project selection, submits BRD → no context appended, analysis proceeds normally. **Expected**: same behavior, no change needed.
- **Pro user, project selected**: User on Pro plan selects "Invoice Module", submits BRD → currently context is appended to user message. **Expected after fix**: `projectId` sent to server, server fetches project, context injected into system prompt instead.
- **Pro user, project not found (RLS miss)**: Pro user sends a `projectId` that doesn't belong to them → Supabase RLS returns no row → analysis proceeds without context, no error exposed to client.
- **Guest user**: No auth, no project selection possible → `projectId` is null or absent → analysis proceeds normally.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Guest rate-limit check and guest analysis flow must continue to work exactly as before.
- `validateAnalyzePayload` must continue to reject missing/empty `text` and oversized payloads — the new `projectId` field is optional and does not affect this validation.
- Pro users submitting a BRD without a project (`projectId: null`) must receive the same analysis as today — base `SYSTEM_PROMPT` only, no context appended.
- Free users submitting a BRD without a project must receive the same analysis as today.
- Usage limit enforcement (429 on limit reached) must fire regardless of `projectId`.
- RLS enforcement: a Pro user sending a `projectId` that doesn't belong to them gets no context injected — the Supabase query returns null, analysis proceeds silently.
- All existing SSE streaming behavior, `incrementUsage`, `logAnalysisEvent` calls remain unchanged.

**Scope:**
All requests that do NOT satisfy `isBugCondition` — i.e., guest requests, free users without a project, Pro users with or without a project, and any request with `projectId: null` — must be completely unaffected by this fix in terms of analysis output.

---

## Hypothesized Root Cause

1. **No server-side plan check**: The `/api/analyze` route queries `subscriptions.plan` only inside `checkUsage` (to determine the usage limit), but never uses the plan value to gate feature access. There is no code path that says "if plan is free, ignore projectId."

2. **Client-side context injection**: `handleAnalyze` in `page.tsx` builds `projectContextStr` and appends it directly to `text` before the fetch. This means the server receives a single opaque string — it cannot distinguish BRD content from project context, and it cannot apply any server-side gate.

3. **No `projectId` in API contract**: The `/api/analyze` route's `validateAnalyzePayload` only reads `text`. There is no mechanism for the client to send a `projectId`, and no mechanism for the server to fetch the project using the authenticated user's session (with RLS).

4. **No paywall CTA in `ProjectSelector`**: The `ProjectSelector` component calls `onSelect(project)` unconditionally for all users. There is no check of the user's plan before allowing selection to proceed to the `'input'` phase.

---

## Correctness Properties

Property 1: Bug Condition — Free User Context Isolation

_For any_ request where `isBugCondition` holds (authenticated free-tier user with a non-null `projectId`), the fixed `/api/analyze` route SHALL NOT include any project context in the system prompt or user message sent to Claude. The analysis result SHALL be identical to a request made with `projectId: null`.

**Validates: Requirements 2.1, 2.3, 2.4**

Property 2: Preservation — Non-Buggy Request Behavior

_For any_ request where `isBugCondition` does NOT hold (guest users, free users without a project, Pro users with or without a project, any request with `projectId: null`), the fixed route SHALL produce the same analysis output as the original route, preserving all existing behavior including usage enforcement, SSE streaming, and error responses.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

---

**File**: `app/api/analyze/route.ts`

**Change 1 — Extend `validateAnalyzePayload` return type and accept `projectId`**

Update the `AnalyzeValidationResult` success branch to carry `projectId`:

```typescript
type AnalyzeValidationResult =
  | { valid: true; text: string; projectId: string | null }
  | { valid: false; error: string; status: number }
```

Inside `validateAnalyzePayload`, after validating `text`, read and validate `projectId`:

```typescript
const projectId = (body as { projectId?: unknown }).projectId
const resolvedProjectId =
  projectId === null || projectId === undefined
    ? null
    : typeof projectId === 'string' && projectId.trim().length > 0
      ? projectId.trim()
      : null   // coerce invalid types to null silently

return { valid: true, text, projectId: resolvedProjectId }
```

**Change 2 — Add `buildSystemPromptWithContext` helper**

```typescript
export function buildSystemPromptWithContext(projectContext?: {
  name: string
  context: ProjectContext
}): string {
  if (!projectContext) return SYSTEM_PROMPT

  const { name, context } = projectContext
  const lines: string[] = [
    `KONTEKS PROJECT: ${name}`,
    '',
    '## Bisnis',
    context.business.description
      ? `Deskripsi: ${context.business.description}`
      : '',
    context.business.domain ? `Domain: ${context.business.domain}` : '',
    context.business.targetUsers.length
      ? `Target Users: ${context.business.targetUsers.join(', ')}`
      : '',
    context.business.compliance.length
      ? `Compliance: ${context.business.compliance.join(', ')}`
      : '',
    '',
    '## Teknis',
    context.technical.frontend
      ? `Frontend: ${context.technical.frontend}`
      : '',
    context.technical.backend
      ? `Backend: ${context.technical.backend}`
      : '',
    context.technical.existingSystems.length
      ? `Existing Systems: ${context.technical.existingSystems.join(', ')}`
      : '',
    context.technical.constraints.length
      ? `Constraints: ${context.technical.constraints.join(', ')}`
      : '',
  ].filter(l => l !== '')

  return `${SYSTEM_PROMPT}\n\n${lines.join('\n')}`
}
```

**Change 3 — Server-side plan check and project fetch in `POST` handler**

After `validateAnalyzePayload` succeeds and inside the `mode === 'user'` branch (after `user` is confirmed), add:

```typescript
let projectContext: { name: string; context: ProjectContext } | undefined

if (validation.projectId && supabase) {
  // Check plan — reuse the subscription query already done in checkUsage
  // (or re-query here for clarity)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan as 'free' | 'pro') || 'free'

  if (plan === 'pro') {
    const { data: project } = await supabase
      .from('projects')
      .select('name, context')
      .eq('id', validation.projectId)
      .single()   // RLS enforced — returns null if not owned by user

    if (project) {
      projectContext = {
        name: project.name as string,
        context: project.context as ProjectContext,
      }
    }
  }
  // If plan === 'free' or project not found: projectContext stays undefined
}
```

**Change 4 — Use `buildSystemPromptWithContext` in the Anthropic call**

Replace the hardcoded `system: SYSTEM_PROMPT` with:

```typescript
system: buildSystemPromptWithContext(projectContext),
```

---

**File**: `app/(app)/analyze/page.tsx`

**Change 5 — Remove client-side context concatenation in `handleAnalyze`**

Remove:
```typescript
const projectContextStr = selectedProject
  ? `\n\nProject Context:\n${JSON.stringify(selectedProject.context, null, 2)}`
  : ''
```

Change the fetch body from:
```typescript
body: JSON.stringify({ text: text + projectContextStr }),
```
to:
```typescript
body: JSON.stringify({ text, projectId: selectedProject?.id ?? null }),
```

**Change 6 — Add paywall CTA in `handleProjectSelect`**

`handleProjectSelect` currently calls `setSelectedProject(project); setPhase('input')` unconditionally. Add a plan check:

```typescript
function handleProjectSelect(project: Project) {
  if (!isAuthenticated) {
    // Guest — should not reach here, but guard anyway
    setPhase('input')
    return
  }
  if (!userPlan || userPlan === 'free') {
    // Show paywall CTA instead of proceeding
    setShowPaywallCTA(true)
    return
  }
  setSelectedProject(project)
  setPhase('input')
}
```

This requires:
- A new `userPlan` state: `const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null)`
- Fetching the plan after auth resolves (reuse the existing `supabase.auth.getUser()` effect, add a `subscriptions` query)
- A new `showPaywallCTA` state and a small inline upgrade prompt rendered in the `select-project` phase

The paywall CTA should be rendered as an inline banner or modal within the `select-project` phase, prompting the user to upgrade to Pro to use Company Context. It should include a dismiss option that returns the user to the project list without selecting.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests for `validateAnalyzePayload` and integration tests for the `POST /api/analyze` handler that simulate a free-tier user sending a request with a `projectId`. Run these on the UNFIXED code to observe that context leaks through.

**Test Cases**:
1. **Free user with projectId — context leak test**: Call `POST /api/analyze` as a free-tier authenticated user with `{ text: "...", projectId: "some-uuid" }`. On unfixed code, the route ignores `projectId` entirely (it's not in the contract), so the test confirms the API contract gap. (Will fail to demonstrate the leak because the old code doesn't accept `projectId` — this confirms root cause #3.)
2. **Client-side concatenation test**: Inspect the fetch body built by `handleAnalyze` when `selectedProject` is set. On unfixed code, `text` will contain the full `JSON.stringify(selectedProject.context)` string. (Demonstrates root cause #2.)
3. **No plan check test**: Call `POST /api/analyze` as a free-tier user with a pre-serialized context string appended to `text`. Confirm the route processes it without any plan check. (Demonstrates root cause #1.)
4. **ProjectSelector no-gate test**: Render `ProjectSelector` as a free-tier user, click a project — confirm `onSelect` is called immediately with no paywall. (Demonstrates root cause #4.)

**Expected Counterexamples**:
- The API contract does not include `projectId` — the server never receives it, confirming the fix must add it.
- The client concatenates context into `text` unconditionally — confirming the fix must remove this.
- No `subscriptions.plan` query exists in the analyze route — confirming the fix must add it.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := POST /api/analyze (user=free, projectId=non-null)
  ASSERT result.systemPromptUsed = SYSTEM_PROMPT (no context appended)
  ASSERT result.userMessage DOES NOT CONTAIN project.context
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT POST /api/analyze (fixed, X) behaves identically to POST /api/analyze (original, X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various `text` lengths, `projectId` values, plan combinations)
- It catches edge cases that manual unit tests might miss (e.g., `projectId` as empty string, whitespace-only string, very long UUID)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Pro users without a project and guest users, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Pro user, no project (projectId: null)**: Verify analysis proceeds with base `SYSTEM_PROMPT` only — no context appended.
2. **Guest user**: Verify guest rate-limit check fires, `projectId` is ignored, analysis proceeds normally.
3. **Free user, no project (projectId: null)**: Verify analysis proceeds normally, identical to pre-fix behavior.
4. **Pro user, projectId not owned by user (RLS miss)**: Verify analysis proceeds without context, no 4xx error.
5. **validateAnalyzePayload — projectId coercion**: Verify that `projectId: 123` (number), `projectId: ""` (empty string), and `projectId: undefined` all resolve to `null` without breaking validation.
6. **Usage limit enforcement**: Verify 429 is returned for a free user at limit, regardless of `projectId`.

### Unit Tests

- Test `buildSystemPromptWithContext(undefined)` returns `SYSTEM_PROMPT` unchanged.
- Test `buildSystemPromptWithContext({ name, context })` returns a string starting with `SYSTEM_PROMPT` and containing `KONTEKS PROJECT: <name>`.
- Test `validateAnalyzePayload` with `projectId` present (string), absent (undefined), null, and invalid types — verify correct `projectId` value in result.
- Test `handleProjectSelect` with `userPlan === 'free'` sets `showPaywallCTA = true` and does NOT call `setPhase('input')`.
- Test `handleAnalyze` fetch body contains `projectId: selectedProject.id` and does NOT contain `projectContextStr`.

### Property-Based Tests

- Generate random `ProjectContext` objects and verify `buildSystemPromptWithContext` always starts with `SYSTEM_PROMPT` and never truncates the base prompt.
- Generate random `projectId` values (valid UUIDs, empty strings, null, undefined, numbers) and verify `validateAnalyzePayload` always returns a `string | null` for `projectId` — never throws.
- Generate random `text` strings (within limit) with random `projectId` values for free-tier users and verify the system prompt used in the Anthropic call never contains `KONTEKS PROJECT:`.

### Integration Tests

- Full flow: free user selects project → paywall CTA shown → user dismisses → project list shown again (no phase change to `'input'`).
- Full flow: Pro user selects project → `'input'` phase → submits BRD → `/api/analyze` called with `projectId` → system prompt contains `KONTEKS PROJECT:` section.
- Full flow: Pro user submits BRD without project → `/api/analyze` called with `projectId: null` → system prompt equals `SYSTEM_PROMPT` exactly.
- Full flow: guest user → no project selector shown → submits BRD → `/api/analyze` called without `projectId` → analysis proceeds normally.
