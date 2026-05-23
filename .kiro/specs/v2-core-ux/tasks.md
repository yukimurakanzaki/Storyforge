# Implementation Plan: v2-core-ux

## Overview

This plan implements the StoryForge v2.0 Sprint 1 core UX changes: removing guest mode entirely, implementing tiered AI model selection, restructuring the analyze page for Free vs Pro users, and adding usage counters, tier badges, watermarks, and upgrade CTAs. Tasks are ordered so that foundational changes (guest removal, model selector) come first, followed by UI components, then integration and wiring.

## Tasks

- [x] 1. Remove guest mode code and enforce route protection
  - [x] 1.1 Delete guest-mode files and remove all guest imports/references
    - Delete `lib/guest-usage.ts`, `lib/guest-rate-limit.ts`, `lib/session/temp-session.ts`, `lib/session/use-migrate-temp-session.ts`, and `app/api/migrate-session/` directory
    - Search entire codebase and remove all imports/references to `canGuestAnalyze`, `incrementGuestUsage`, `readGuestUsage`, `checkGuestRateLimit`, `useMigrateTempSession`
    - Remove any `x-guest-mode` header handling from API routes
    - Remove "Lanjutkan sebagai Tamu" link from login and signup pages
    - Remove any unused or commented-out guest-mode logic from all files
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.5_

  - [x] 1.2 Update middleware to protect `/analyze` route
    - Modify `isProtectedAppPath` in `lib/supabase/middleware.ts` to match `/analyze` exactly in addition to `/analyze/` prefix
    - Ensure unauthenticated users are redirected to `/login?redirect=/analyze`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.3 Add auth guard to API routes (`/api/analyze`, `/api/refine`, `/api/requirements`)
    - In each route, verify auth session via `getUser()` at the start of the handler
    - Return HTTP 401 with `{ error: "Unauthorized", message: "Login diperlukan." }` if no session
    - Remove any guest-mode fallback logic or IP-based rate limiting for unauthenticated users
    - Ensure no guest-mode code remains (even unused/commented-out)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.4 Add auth error fallback to login/signup pages
    - Create `AuthErrorFallback` component that displays when login services are unavailable
    - On login/signup pages, detect when both Google OAuth and email/password are unavailable
    - Display user-friendly error message with retry option
    - _Requirements: 2.3_

  - [x]* 1.5 Write property test for protected path coverage
    - **Property 1: Protected path coverage**
    - For any URL path that equals `/analyze` or starts with `/analyze/`, `isProtectedAppPath` returns `true`
    - Use fast-check to generate random path suffixes appended to `/analyze`
    - **Validates: Requirements 1.2, 1.3**

- [x] 2. Implement tiered AI model selector
  - [x] 2.1 Create `lib/model-selector.ts` with `getModelConfig` pure function
    - Export `AIProvider` type (`'google' | 'anthropic'`) and `ModelConfig` interface
    - Implement `getModelConfig(plan: 'free' | 'pro'): ModelConfig`
    - Free plan returns `{ provider: 'google', model: 'gemini-2.0-flash' }`
    - Pro plan returns `{ provider: 'anthropic', model: 'claude-haiku-4-5-20251001', headers: { 'anthropic-beta': 'zdr-2025-01-01' } }`
    - Add defensive fallback: unknown plan defaults to free config
    - _Requirements: 5.1, 5.2, 5.3, 5.7_

  - [x] 2.2 Integrate model selector into API routes
    - Update `/api/analyze`, `/api/refine`, and `/api/requirements` to call `getModelConfig(plan)` using the authenticated user's plan from the subscriptions table
    - Use the returned config to instantiate the correct AI provider client
    - Pass ZDR headers when provider is `'anthropic'`
    - _Requirements: 5.4, 5.5, 5.6_

  - [x]* 2.3 Write property test for ZDR header invariant
    - **Property 2: ZDR header invariant for Anthropic models**
    - For any plan value where `getModelConfig(plan)` returns `provider: 'anthropic'`, the config includes `anthropic-beta: zdr-2025-01-01` header
    - **Validates: Requirements 5.3**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement usage data fetching and counter component
  - [x] 4.1 Create `/api/usage` route for server-side usage data
    - Implement GET handler with auth check
    - If no authenticated session, return early with fallback response (skip DB fetch entirely)
    - Fetch usage count from `usage_counters` table and plan from `subscriptions` table
    - Return `{ count, limit, plan }` response shape (limit: 3 for free, 50 for pro)
    - On error, return appropriate error response
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 4.2 Create `UsageCounter` component (`components/analyze/UsageCounter.tsx`)
    - Accept props: `{ used, limit, plan, onClick? }`
    - Render text in format `"{used}/{limit} analisis"`
    - Apply color logic: green (`text-green-600`) when remaining > 50%, yellow (`text-yellow-600`) when 25%-50%, red (`text-red-600`) when < 25%
    - Handle zero-limit special case: hide counter or display distinct "N/A" state (no percentage calculation)
    - On click (free tier), trigger upgrade CTA display
    - Implement fallback state ("—/— analisis" in gray) for when data fetch fails
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.2, 12.3_

  - [x]* 4.3 Write property test for usage counter display format
    - **Property 3: Usage counter display format**
    - For any valid `(used, limit)` pair where `0 <= used <= limit` and `limit > 0`, the component renders text matching `"{used}/{limit} analisis"`
    - Use fast-check to generate random (used, limit) pairs with `limit ∈ [1, 1000]`
    - **Validates: Requirements 10.1**

  - [x]* 4.4 Write property test for usage counter color thresholds
    - **Property 4: Usage counter color matches threshold band**
    - For any valid `(used, limit)` pair, verify: green when `(limit - used) / limit > 0.5`, yellow when `0.25 <= (limit - used) / limit <= 0.5`, red when `(limit - used) / limit < 0.25`
    - Use fast-check to generate pairs across all threshold bands
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [x]* 4.5 Write property test for zero-limit special case
    - **Property 5: Zero-limit counter special case**
    - For any `(used, limit)` pair where `limit === 0`, the component does NOT attempt percentage calculation and renders a distinct fallback state
    - **Validates: Requirements 10.5**

- [x] 5. Implement tier badge, watermark, and upgrade CTA components
  - [x] 5.1 Create `TierBadge` component (`components/ui/TierBadge.tsx`)
    - Accept props: `{ plan: 'free' | 'pro' }`
    - Render pill badge: "Free" with gray background or "Pro" with teal background
    - Ensure visually distinct from surrounding text
    - Place in global app header (not page-specific) so it displays on all authenticated pages
    - _Requirements: 8.1, 8.2_

  - [x] 5.2 Create `Watermark` component (`components/analyze/Watermark.tsx`)
    - Accept props: `{ plan: 'free' | 'pro' }`
    - If free: render "Generated by StoryForge.id — Upgrade ke Pro untuk menghapus watermark" with reduced opacity
    - If pro: return `null`
    - Ensure watermarks are rendered on ALL sections simultaneously (all-or-nothing for free-tier)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 5.3 Create `UpgradeCTA` component (`components/analyze/UpgradeCTA.tsx`)
    - Accept props: `{ message?: string }`
    - Render inline card with upgrade messaging and link to pricing/upgrade page
    - Used for both usage-limit-reached state and free-tier click-on-counter
    - _Requirements: 9.1, 9.2, 9.3_

  - [x]* 5.4 Write unit tests for TierBadge, Watermark, and UpgradeCTA
    - Test TierBadge renders correct text and styling for each plan
    - Test TierBadge appears in global header (not page-specific)
    - Test Watermark renders for free, returns null for pro
    - Test Watermark all-or-nothing: verify all sections get watermarks simultaneously
    - Test UpgradeCTA renders message and contains upgrade link
    - _Requirements: 8.1, 8.2, 11.4, 9.4_

- [x] 6. Restructure Analyze page for Free vs Pro UX
  - [x] 6.1 Implement conditional page layout based on user tier
    - Fetch user plan and usage data server-side on page load (skip fetch if not authenticated)
    - Free tier: display BRD input form immediately and guarantee it's visible on initial render, without project selector or Company Context
    - Pro tier: display project selector before BRD input, load Company Context on project selection
    - Pro tier: if Company Context fails to load, display error state and block BRD input until retry succeeds
    - Add UsageCounter to page header
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 12.2_

  - [x] 6.2 Integrate Watermark into analysis results sections
    - Append Watermark component at the bottom of gap list section
    - Append Watermark component at the bottom of clarification questions section
    - Append Watermark component at the bottom of PRD output section
    - Pass user plan to Watermark to conditionally render
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 6.3 Implement usage limit handling with inline UpgradeCTA and blocking wall
    - When free-tier user has used all 3 monthly analyses, display UpgradeCTA with limit-reached message
    - Between 4-6 analyses: show prominent Upgrade CTA but do NOT block (no full-screen wall)
    - Above 6 analyses (2x limit): display full-screen blocking wall preventing further analysis
    - Wire UsageCounter click (free tier) to show UpgradeCTA
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.6_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All UI text is in Bahasa Indonesia as per project conventions
- The model selector is a pure function — easy to test and extend for future tiers
- Guest mode removal should be done first to avoid conflicts with subsequent changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.2"] },
    { "id": 2, "tasks": ["1.5", "2.3", "4.1", "5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["4.2", "5.4"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] }
  ]
}
```
