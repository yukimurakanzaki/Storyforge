# ZDR Header Compliance Bugfix Design

## Overview

All three Anthropic API routes (`/api/analyze`, `/api/refine`, `/api/requirements`) instantiate their own `Anthropic` client without the `anthropic-beta: zdr-2025-01-01` header. The fix centralizes client creation into a shared `lib/anthropic.ts` module that configures `defaultHeaders` with the ZDR beta flag, then refactors each route to import from this module. This is a minimal, surgical change — no architectural redesign, no behavioral changes to request/response handling.

## Glossary

- **Bug_Condition (C)**: Any Anthropic API call made without the `anthropic-beta: zdr-2025-01-01` header
- **Property (P)**: Every Anthropic API call includes the ZDR header via `defaultHeaders` on the shared client
- **Preservation**: All existing route behavior (auth checks, rate limiting, response formats, error handling) remains identical
- **ZDR (Zero Data Retention)**: Anthropic beta feature that prevents input/output data retention when the header is present
- **`lib/anthropic.ts`**: New shared module exporting a pre-configured Anthropic client instance

## Bug Details

### Bug Condition

The bug manifests on every Anthropic API call from any of the three routes. Each route creates its own `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` without specifying `defaultHeaders`, so the ZDR header is never sent.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AnthropicClientConfig
  OUTPUT: boolean
  
  RETURN input.defaultHeaders does NOT contain key 'anthropic-beta'
         OR input.defaultHeaders['anthropic-beta'] does NOT equal 'zdr-2025-01-01'
END FUNCTION
```

### Examples

- `/api/analyze` calls `client.messages.create(...)` → request sent without `anthropic-beta` header → Anthropic may retain BRD text
- `/api/refine` calls `client.messages.create(...)` → request sent without `anthropic-beta` header → Anthropic may retain conversation history
- `/api/requirements` calls `client.messages.create(...)` → request sent without `anthropic-beta` header → Anthropic may retain user stories output
- After fix: all three routes import from `lib/anthropic.ts` → every request includes `anthropic-beta: zdr-2025-01-01`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All three routes continue to return identical response bodies and status codes for valid/invalid inputs
- Auth guard logic (Supabase session check, guest-mode header, rate limiting) is untouched
- Model selection (`claude-haiku-4-5-20251001`), `max_tokens`, `temperature`, and system prompts remain the same
- Error handling and JSON parsing logic in each route is unchanged
- The `ANTHROPIC_API_KEY` environment variable continues to be the sole authentication mechanism

**Scope:**
The only change is how the `Anthropic` client is instantiated. No request/response logic, no auth logic, no prompt logic is modified.

## Hypothesized Root Cause

The root cause is straightforward — the ZDR header was never added:

1. **Missing `defaultHeaders` configuration**: All three routes use `new Anthropic({ apiKey: ... })` without a `defaultHeaders` field. The SDK supports `defaultHeaders` but it was never configured.

2. **No shared client module**: Each route independently creates its own client, so there's no single place to enforce the header. This made the omission easy to miss and hard to audit.

3. **Documentation-code drift**: The PRD v1.5 and CLAUDE.md claim ZDR is active, but no code ever implemented it. The compliance claim was aspirational, not enforced.

## Correctness Properties

Property 1: Bug Condition - ZDR Header Present on All API Calls

_For any_ Anthropic client instance created by the application, the client SHALL have `defaultHeaders` containing `'anthropic-beta': 'zdr-2025-01-01'`, ensuring every API call includes the ZDR header regardless of which route initiates it.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Route Behavior Unchanged

_For any_ valid or invalid request to `/api/analyze`, `/api/refine`, or `/api/requirements`, the fixed routes SHALL produce the same response body and status code as the original routes, preserving all auth checks, rate limiting, response formats, and error handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `lib/anthropic.ts` (NEW)

Create a shared module that exports a pre-configured Anthropic client:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-beta': 'zdr-2025-01-01',
  },
})
```

**File**: `app/api/analyze/route.ts`

- Remove: `import Anthropic from '@anthropic-ai/sdk'`
- Remove: `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
- Add: `import { anthropic } from '@/lib/anthropic'`
- Replace: `client.messages.create(...)` → `anthropic.messages.create(...)`
- Keep the `import type ... Anthropic.TextBlock` usage (import type separately if needed for the type guard)

**File**: `app/api/refine/route.ts`

- Remove: `import Anthropic from '@anthropic-ai/sdk'`
- Remove: `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
- Add: `import { anthropic } from '@/lib/anthropic'`
- Replace: `client.messages.create(...)` → `anthropic.messages.create(...)`
- Keep the `Anthropic.TextBlock` type reference (import type separately)

**File**: `app/api/requirements/route.ts`

- Remove: `import Anthropic from '@anthropic-ai/sdk'`
- Remove: `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
- Add: `import { anthropic } from '@/lib/anthropic'`
- Replace: `client.messages.create(...)` → `anthropic.messages.create(...)`
- Keep the `Anthropic.TextBlock` type reference (import type separately)

**File**: `obsidian-vault/02-Tech/API-Architecture.md` (NEW)

Document the shared client pattern and ZDR enforcement for future developers.

## Testing Strategy

### Validation Approach

The testing strategy verifies the header is present via unit tests that mock the Anthropic SDK constructor. No real API calls are needed — we inspect the configuration passed to the client.

### Exploratory Bug Condition Checking

**Goal**: Confirm the bug exists by inspecting the current client instantiation in each route.

**Test Plan**: Write a unit test that imports `lib/anthropic.ts` and asserts the `defaultHeaders` property contains the ZDR header. Run against the unfixed code (before `lib/anthropic.ts` exists) to confirm failure.

**Test Cases**:
1. **Shared module exports client with ZDR header**: Import `anthropic` from `lib/anthropic` and assert `defaultHeaders` includes `anthropic-beta: zdr-2025-01-01` (will fail before fix)

**Expected Counterexamples**:
- Module does not exist → import fails
- After creation: `defaultHeaders` is undefined or missing the key

### Fix Checking

**Goal**: Verify that the shared client always includes the ZDR header.

**Pseudocode:**
```
FOR ALL instances WHERE anthropic client is created DO
  result := import { anthropic } from 'lib/anthropic'
  ASSERT result._options.defaultHeaders['anthropic-beta'] === 'zdr-2025-01-01'
END FOR
```

### Preservation Checking

**Goal**: Verify that route behavior is unchanged after swapping the client import.

**Pseudocode:**
```
FOR ALL requests to /api/analyze, /api/refine, /api/requirements DO
  ASSERT response_fixed.status === response_original.status
  ASSERT response_fixed.body === response_original.body
END FOR
```

**Testing Approach**: Unit tests mock `@anthropic-ai/sdk` at the module level. The mock captures constructor arguments, letting us assert `defaultHeaders` without making network calls. Existing route tests (if any) continue to pass unchanged since the mock behavior is identical.

**Test Cases**:
1. **Constructor receives ZDR header**: Mock `Anthropic` constructor, import `lib/anthropic`, assert constructor was called with `defaultHeaders` containing the ZDR key
2. **Routes use shared client**: Verify each route file imports from `@/lib/anthropic` (static analysis / grep check)
3. **No direct Anthropic instantiation in routes**: Verify no route file contains `new Anthropic(` (static analysis / grep check)

### Unit Tests

- `lib/anthropic.test.ts`: Assert exported client has correct `defaultHeaders`
- Mock the `Anthropic` constructor via `vi.mock('@anthropic-ai/sdk')` and inspect the config object passed to it
- Verify `apiKey` is read from `process.env.ANTHROPIC_API_KEY`

### Property-Based Tests

- Not applicable for this fix — the bug condition is deterministic (header present or not), not dependent on input variety. A simple unit assertion is sufficient.

### Integration Tests

- After deployment: make a test API call and verify via Anthropic dashboard/logs that ZDR is active (manual verification)
- Alternatively: intercept outgoing HTTP requests in a test environment and assert the `anthropic-beta` header is present
