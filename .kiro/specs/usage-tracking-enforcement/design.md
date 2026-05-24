# Usage Tracking Enforcement Bugfix Design

## Overview

The `/api/analyze` route processes BRD analysis requests but never calls the existing usage-tracking functions from `lib/usage.ts`. Free-tier users get unlimited analyses (should be 3/month), the `analysis_events` table stays empty (breaking WAA tracking), and `FREE_TIER_LIMIT` is incorrectly set to 5 instead of 3. The fix is surgical: wire `checkUsage()`, `incrementUsage()`, and `logAnalysisEvent()` into the authenticated path of `route.ts`, correct the constant, and handle the upsert case for first-time users in `incrementUsage()`.

## Glossary

- **Bug_Condition (C)**: An authenticated user request reaches the Anthropic API call without a prior usage check, or completes without incrementing the counter or logging events
- **Property (P)**: For authenticated users, usage is checked before the AI call, incremented after success, and events are logged at start and completion
- **Preservation**: Guest rate-limiting, validation errors, auth rejection, and Pro-tier access must remain unchanged
- **`checkUsage()`**: Function in `lib/usage.ts` that queries `usage_counters` and `subscriptions` to determine if a user is within their rolling 30-day limit
- **`incrementUsage()`**: Function in `lib/usage.ts` that increments the `usage_counters.count` for a user
- **`logAnalysisEvent()`**: Function in `lib/usage.ts` that inserts a row into `analysis_events`
- **`FREE_TIER_LIMIT`**: Constant in `lib/constants.ts` defining the monthly analysis cap for free users (should be 3)

## Bug Details

### Bug Condition

The bug manifests when an authenticated user (free or pro) calls `/api/analyze`. The route handler authenticates the user but never imports or calls `checkUsage`, `incrementUsage`, or `logAnalysisEvent`. Additionally, `FREE_TIER_LIMIT` is 5 instead of 3, so even if enforcement were wired up, the wrong limit would apply.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { request: NextRequest, user: AuthUser | null }
  OUTPUT: boolean

  RETURN input.user IS NOT NULL
         AND request.headers['x-guest-mode'] != '1'
         AND (
           usageCheckNotCalled(input.request)
           OR usageIncrementNotCalled(input.request)
           OR analysisEventNotLogged(input.request)
           OR FREE_TIER_LIMIT != 3
         )
END FUNCTION
```

### Examples

- **Free user, 3rd analysis**: User calls `/api/analyze` → analysis proceeds without limit check → counter stays at 0 → user gets unlimited analyses (expected: 429 after 3)
- **Free user, 1st analysis**: User calls `/api/analyze` → no `usage_counters` row exists → `incrementUsage` does UPDATE on non-existent row → count stays 0 (expected: upsert creates row with count=1)
- **Any authenticated user completes analysis**: No `analysis_events` row is inserted → WAA metric is untrackable (expected: `analysis_started` + `analysis_completed` events logged)
- **Pro user, 51st analysis**: No check occurs → analysis proceeds (expected: 429 after 50)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Guest users (`x-guest-mode: 1`) continue to use the in-memory rate limiter with no Supabase calls
- Invalid/oversized payloads return 400/413 before any usage check
- Unauthenticated non-guest requests return 401
- Anthropic API failures return 500 without incrementing usage
- Pro-tier users within their 50/month limit proceed normally
- The response JSON format from Anthropic remains unchanged

**Scope:**
All inputs that do NOT involve authenticated user usage tracking should be completely unaffected by this fix. This includes:
- Guest mode requests (rate-limited by IP, not Supabase)
- Validation failures (checked before usage)
- Auth failures (rejected before usage)
- Anthropic API errors (no increment on failure)

## Hypothesized Root Cause

Based on the bug description, the issues are:

1. **Missing imports and calls**: `route.ts` never imports `checkUsage`, `incrementUsage`, or `logAnalysisEvent` from `lib/usage.ts`. The functions exist and are fully implemented but simply not wired in.

2. **Incorrect constant value**: `FREE_TIER_LIMIT` in `lib/constants.ts` is set to `5` instead of the PRD-specified `3`.

3. **Missing upsert in `incrementUsage()`**: The function does `supabase.from('usage_counters').update(...)` which silently fails for users without an existing row. It needs to upsert (insert if not exists, update if exists) to handle first-time users.

4. **No session ID generation**: The route doesn't generate a `sessionId` needed by `logAnalysisEvent()`. A UUID must be created per request.

## Correctness Properties

Property 1: Bug Condition - Usage Enforcement Blocks Over-Limit Users

_For any_ authenticated free-tier user request where the rolling 30-day usage count is ≥ 3 (FREE_TIER_LIMIT), the fixed `/api/analyze` route SHALL return a 429 response with `X-Limit-Reached: true` header and a JSON body containing `count`, `limit`, and `plan` fields, without calling the Anthropic API.

**Validates: Requirements 2.1, 2.5**

Property 2: Bug Condition - Usage Increment and Event Logging on Success

_For any_ authenticated user request that completes successfully (Anthropic returns valid JSON), the fixed route SHALL call `incrementUsage()` exactly once (incrementing `usage_counters.count` by 1, upserting if no row exists) and SHALL call `logAnalysisEvent()` twice (once with `analysis_started` before the AI call, once with `analysis_completed` after success with `word_count` and `duration_ms`).

**Validates: Requirements 2.2, 2.3, 2.6**

Property 3: Preservation - Guest and Error Paths Unchanged

_For any_ request that is either guest mode, unauthenticated, invalid payload, or results in an Anthropic API error, the fixed route SHALL produce exactly the same response as the original route, with no Supabase usage calls made for guests and no usage increment on failure.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lib/constants.ts`

**Change**: Fix `FREE_TIER_LIMIT` value

**Specific Changes**:
1. **Correct the limit**: Change `export const FREE_TIER_LIMIT = 5` to `export const FREE_TIER_LIMIT = 3`

---

**File**: `lib/usage.ts`

**Function**: `incrementUsage`

**Specific Changes**:
1. **Add upsert logic**: Replace the UPDATE-only approach with an upsert. First attempt an INSERT with `count: 1`, `first_analysis_at: now`, `reset_at: now + 30 days`. If the row already exists (conflict on `user_id`), fall back to incrementing the existing count. Use Supabase's `.upsert()` with `onConflict: 'user_id'` or check if the SELECT returns null and INSERT before UPDATE.

---

**File**: `app/api/analyze/route.ts`

**Function**: `POST`

**Specific Changes**:
1. **Add imports**: Import `checkUsage`, `incrementUsage`, `logAnalysisEvent` from `@/lib/usage` and `crypto` (or `crypto.randomUUID()`) for session IDs.

2. **Insert usage check after auth**: After the `if (!user)` block inside the `else` branch, call `const usageResult = await checkUsage(supabase, user.id)`. If `!usageResult.allowed`, return a 429 response with `X-Limit-Reached: true` header and usage info JSON.

3. **Generate session ID**: Create `const sessionId = crypto.randomUUID()` at the start of the authenticated path.

4. **Log `analysis_started`**: After validation passes and before the Anthropic call, call `await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_started', wordCount)` where `wordCount` is derived from `validation.text.split(/\s+/).length`.

5. **Record start time**: Add `const startTime = Date.now()` before the Anthropic call to measure duration.

6. **Increment usage after success**: After `JSON.parse(cleaned)` succeeds, call `await incrementUsage(supabase, user.id)`.

7. **Log `analysis_completed`**: After increment, call `await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_completed', wordCount, Date.now() - startTime)`.

8. **Scope variables**: The `supabase` client and `user` object need to be accessible in the try/catch block. Hoist them to function scope or restructure the auth block to set outer variables.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that mock Supabase and Anthropic, then call the POST handler as an authenticated free-tier user. Assert that `checkUsage` is called, that `incrementUsage` is called on success, and that `logAnalysisEvent` is called at start and completion. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **No Usage Check Test**: Send authenticated request → verify `usage_counters` is queried before Anthropic call (will fail on unfixed code — no query made)
2. **No Increment Test**: Send authenticated request that succeeds → verify `usage_counters.count` is incremented (will fail on unfixed code — no update made)
3. **No Event Logging Test**: Send authenticated request → verify `analysis_events` receives rows (will fail on unfixed code — no insert made)
4. **Wrong Limit Test**: Verify `FREE_TIER_LIMIT` equals 3 (will fail on unfixed code — returns 5)
5. **First-Time User Test**: Send request for user with no `usage_counters` row → verify row is created (will fail on unfixed code — UPDATE on non-existent row)

**Expected Counterexamples**:
- `checkUsage` is never imported or called in route.ts
- `usage_counters` table is never queried during request processing
- `analysis_events` table receives no inserts
- Possible causes: missing imports, missing function calls, missing upsert logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isAuthenticatedUser(input) DO
  IF usageCount >= FREE_TIER_LIMIT AND plan == 'free' THEN
    result := POST_fixed(input)
    ASSERT result.status == 429
    ASSERT result.headers['X-Limit-Reached'] == 'true'
    ASSERT anthropicNotCalled()
  ELSE
    result := POST_fixed(input)
    ASSERT result.status == 200
    ASSERT usageCounterIncremented(user.id)
    ASSERT analysisStartedLogged(user.id)
    ASSERT analysisCompletedLogged(user.id)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE isGuestMode(input) OR isInvalidPayload(input) OR isUnauthenticated(input) DO
  ASSERT POST_original(input).status == POST_fixed(input).status
  ASSERT POST_original(input).body == POST_fixed(input).body
  ASSERT noSupabaseUsageCalls(input)  -- for guest mode
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various payload sizes, guest headers, auth states)
- It catches edge cases that manual unit tests might miss (e.g., empty strings, boundary-length payloads)
- It provides strong guarantees that behavior is unchanged for all non-authenticated paths

**Test Plan**: Observe behavior on UNFIXED code first for guest requests, invalid payloads, and auth failures, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Guest Rate Limit Preservation**: Verify guest requests still use in-memory rate limiter, no Supabase usage calls made
2. **Validation Error Preservation**: Verify invalid/oversized payloads return same 400/413 responses
3. **Auth Failure Preservation**: Verify unauthenticated non-guest requests return 401
4. **Anthropic Error Preservation**: Verify that when Anthropic throws, response is 500 and no usage increment occurs

### Unit Tests

- Test `checkUsage` returns `allowed: false` when count ≥ limit for free tier
- Test `checkUsage` returns `allowed: true` for pro tier regardless of count (up to PRO_TIER_LIMIT)
- Test `incrementUsage` upserts correctly for new users (no existing row)
- Test `incrementUsage` increments correctly for existing users
- Test `logAnalysisEvent` inserts correct event_type and metadata
- Test route returns 429 with correct headers when limit reached
- Test route does NOT increment on Anthropic failure

### Property-Based Tests

- Generate random authenticated user states (varying counts 0–10, plans free/pro) and verify enforcement logic is correct for all combinations
- Generate random valid payloads and verify that successful analyses always result in exactly one increment and two event logs
- Generate random invalid inputs (missing text, oversized, bad JSON) and verify no usage side effects occur

### Integration Tests

- Test full flow: authenticated free user → 3 successful analyses → 4th returns 429
- Test full flow: new user with no `usage_counters` row → first analysis creates row with count=1
- Test full flow: user with expired `reset_at` → counter resets to 0, analysis proceeds
- Test full flow: Pro user → 50 analyses succeed, 51st returns 429
- Test full flow: guest user → uses in-memory limiter, no database interaction
