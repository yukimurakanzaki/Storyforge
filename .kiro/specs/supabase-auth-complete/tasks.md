# Implementation Plan: Supabase Auth Complete

## Overview

Implement the remaining authentication features for StoryForge: Google OAuth, password recovery, email verification enforcement, brute-force protection, account deletion (UU PDP compliance), and logout from all devices. All features extend the existing `@supabase/ssr` infrastructure using TypeScript, Next.js App Router API routes, and the established UI patterns.

## Tasks

- [x] 1. Implement rate limiter module
  - [x] 1.1 Create `lib/auth/rate-limit.ts` with sliding window rate limiter
    - Implement `SlidingWindowEntry` interface with `timestamps: number[]`
    - Create separate `loginBuckets` and `resetBuckets` Maps
    - Implement `checkAuthRateLimit(ip, action)` returning `{ allowed, remaining, retryAfterSeconds }`
    - Implement `recordAuthFailure(ip, action)` to push timestamp into the bucket
    - Implement `getClientIp(request)` extracting first value from `x-forwarded-for`, fallback to "unknown"
    - Use 15-minute window, 5 attempts for login, 3 for reset, MAX_ENTRIES 5000 pruning threshold
    - Follow the existing `lib/guest-rate-limit.ts` Map-based bucket pattern
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [ ]* 1.2 Write property test for rate limiter sliding window enforcement
    - **Property 2: Rate limiter sliding window enforcement**
    - Generate random sequences of attempt timestamps within and across 15-minute windows
    - Verify allow/reject decisions match threshold (5 for login, 3 for reset)
    - Verify `retryAfterSeconds` is correct when threshold is reached
    - Verify attempts are allowed once prior attempts age beyond the 15-minute window
    - **Validates: Requirements 4.1, 4.2, 4.6**

- [x] 2. Implement server-side login proxy with rate limiting
  - [x] 2.1 Create `app/api/auth/login/route.ts`
    - Accept POST with `{ email, password }` body
    - Call `checkAuthRateLimit(ip, 'login')` before attempting auth
    - Return 429 with `retry-after` header and JSON `{ error, retryAfter }` when rate limited
    - Call Supabase `signInWithPassword` via server client
    - On auth error: call `recordAuthFailure(ip, 'login')`, return 401 with `{ error }`
    - On success: set session cookies and return 200
    - _Requirements: 4.1, 4.4, 4.5, 4.7_

  - [ ]* 2.2 Write unit tests for login proxy route
    - Test successful login returns 200 with cookies
    - Test invalid credentials returns 401 and increments failure counter
    - Test rate-limited IP returns 429 with correct retry-after header
    - _Requirements: 4.1, 4.4, 4.7_

- [x] 3. Implement password reset API route with rate limiting
  - [x] 3.1 Create `app/api/auth/reset-password/route.ts`
    - Accept POST with `{ email }` body
    - Call `checkAuthRateLimit(ip, 'reset')` before processing
    - Return 429 with `retry-after` header when rate limited
    - Call Supabase `resetPasswordForEmail` with redirect URL to `/update-password`
    - Always return 200 regardless of whether email exists (prevent enumeration)
    - _Requirements: 2.2, 2.3, 4.2_

  - [ ]* 3.2 Write unit tests for reset password route
    - Test always returns 200 for valid and invalid emails
    - Test rate-limited IP returns 429
    - _Requirements: 2.2, 2.3, 4.2_

- [x] 4. Update middleware for email verification enforcement
  - [x] 4.1 Add verification guard logic to `lib/supabase/middleware.ts`
    - After user is fetched, check `email_confirmed_at` is null AND `app_metadata.providers` is exactly `["email"]`
    - If unverified email-only user accesses a protected route, redirect to `/verify-email`
    - OAuth users (providers contains non-"email" provider) bypass verification check
    - Add `/verify-email` to the list of pages that don't require verification
    - _Requirements: 3.1, 3.6, 3.7_

  - [x] 4.2 Update `middleware.ts` matcher to exclude verify-email from auth redirect
    - Ensure `/verify-email` is accessible to authenticated but unverified users
    - _Requirements: 3.1_

  - [ ]* 4.3 Write property test for verification guard routing correctness
    - **Property 1: Verification guard routing correctness**
    - Generate random user objects with varying `email_confirmed_at` (null or timestamp) and `providers` arrays
    - Verify: allow access if `email_confirmed_at` is non-null
    - Verify: allow access if `providers` contains any provider other than "email"
    - Verify: redirect to `/verify-email` only when `email_confirmed_at` is null AND `providers` is exactly `["email"]`
    - **Validates: Requirements 3.1, 3.6, 3.7**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update callback route for OAuth and password recovery
  - [x] 6.1 Modify `app/api/auth/callback/route.ts` to handle OAuth and recovery flows
    - Detect OAuth provider from user's `app_metadata.providers` after code exchange
    - Skip set-password redirect for OAuth users (providers includes non-"email" provider)
    - Handle `type=recovery` search param: redirect to `/update-password` instead of app
    - Extract display name from `user_metadata.full_name` or `user_metadata.name`, fallback to email prefix
    - Store extracted display name in `profiles.full_name` via Supabase update
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.4_

  - [ ]* 6.2 Write property test for display name extraction
    - **Property 3: Display name extraction always produces a non-empty string**
    - Generate random `user_metadata` objects with varying presence of `full_name`, `name`, and `email` fields
    - Verify the extraction logic always produces a non-empty string
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 6.3 Write unit tests for callback route OAuth handling
    - Test OAuth user skips set-password redirect
    - Test recovery type redirects to update-password page
    - Test display name extraction with various metadata combinations
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 7. Implement Google OAuth UI on login and signup pages
  - [x] 7.1 Update `app/(auth)/login/page.tsx` with Google OAuth button and server proxy
    - Add "Masuk dengan Google" button that calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with redirect to `/api/auth/callback`
    - Add "Lupa password?" link below password field, navigating to `/forgot-password`
    - Switch form submission from client-side `signInWithPassword` to POST to `/api/auth/login` server proxy
    - Handle 429 response: display rate limit message in Bahasa Indonesia with minutes remaining
    - Read `?error=auth` query param and display "Login dengan Google gagal. Silakan coba lagi."
    - _Requirements: 1.1, 1.6, 1.7, 2.1, 4.4_

  - [x] 7.2 Update `app/(auth)/signup/page.tsx` with Google OAuth button
    - Add "Daftar dengan Google" button that calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with redirect to `/api/auth/callback`
    - _Requirements: 1.7_

- [x] 8. Implement forgot password and update password pages
  - [x] 8.1 Create `app/(auth)/forgot-password/page.tsx`
    - Email input form following existing card-centered layout
    - Submit calls POST to `/api/auth/reset-password`
    - Always show same confirmation message regardless of email existence: "Cek email kamu untuk link reset password."
    - Handle 429: display rate limit message with minutes remaining
    - Disable submit button and show loading indicator while processing
    - _Requirements: 2.1, 2.2, 2.3, 2.9_

  - [x] 8.2 Create `app/(auth)/update-password/page.tsx`
    - Password field + confirmation field form
    - Validate using existing `validatePassword` rules and confirm match
    - Display inline validation errors in Bahasa Indonesia without clearing fields
    - On success: call `supabase.auth.updateUser({ password })` and redirect to `/login` with success message
    - Handle expired/invalid token: display error message with link back to `/forgot-password`
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 9. Implement email verification pending page
  - [x] 9.1 Create `app/(auth)/verify-email/page.tsx`
    - Display message instructing user to check inbox for verification link
    - Add resend verification button that calls `supabase.auth.resend({ type: 'signup', email })`
    - Show confirmation message on successful resend
    - Show error message on failed resend, keep button enabled for retry
    - Disable resend button for 60 seconds after click (cooldown timer)
    - On page refresh or navigation, middleware will detect verified status and allow through
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement account deletion API route
  - [x] 11.1 Create `app/api/auth/delete-account/route.ts`
    - Require authenticated session (get user from server client)
    - Accept POST with `{ password, confirmPhrase }` body
    - Re-authenticate user by calling `signInWithPassword` with provided password
    - Validate `confirmPhrase` is exactly "HAPUS AKUN" (case-sensitive, trimmed)
    - Delete from tables in order: analyze_sessions, analysis_history, analysis_events, projects, company_context, saved_clarifications, usage_counters, subscriptions, profiles
    - Use service role client (`createServiceClient()`) for admin-level access bypassing RLS
    - Call `supabase.auth.admin.deleteUser(uid)` after all table deletions succeed
    - Implement rollback: if any deletion fails, re-insert previously deleted rows
    - Implement 30-second timeout via AbortController
    - Return 200 on success, 401 on re-auth failure, 400 on wrong phrase, 500/504 on deletion failure/timeout
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 11.2 Write property test for confirmation phrase validation strictness
    - **Property 6: Confirmation phrase validation strictness**
    - Generate random strings (including near-matches, different cases, with whitespace)
    - Verify only exact "HAPUS AKUN" passes, all other strings are rejected
    - **Validates: Requirements 5.3**

  - [ ]* 11.3 Write property test for account deletion completeness
    - **Property 4: Account deletion completeness**
    - Generate random user data across all application tables (mocked DB)
    - Execute deletion service and verify zero remaining rows for that user ID in all tables
    - **Validates: Requirements 5.4**

  - [ ]* 11.4 Write property test for account deletion atomicity
    - **Property 5: Account deletion atomicity (rollback on failure)**
    - Generate random failure points during the cascading deletion sequence
    - Verify rollback restores state: total row count identical to pre-deletion state
    - **Validates: Requirements 5.7**

- [x] 12. Implement global logout API route
  - [x] 12.1 Create `app/api/auth/logout-all/route.ts`
    - Require authenticated session (get user from server client)
    - Accept POST request (no body needed)
    - Call `supabase.auth.admin.signOut(userId, 'global')` via service role client
    - Implement 15-second timeout via AbortController
    - On success: sign out current session, clear cookies, return 200
    - On failure/timeout: return 500/504 with error message, preserve session
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ]* 12.2 Write unit tests for global logout route
    - Test successful logout returns 200 and clears session
    - Test timeout returns 504 and preserves session
    - Test API failure returns 500 with error message
    - _Requirements: 6.3, 6.4, 6.6_

- [x] 13. Implement account deletion and global logout UI on settings page
  - [x] 13.1 Add account deletion UI to settings page
    - Add visually distinct destructive-action deletion button
    - Implement re-authentication step: password input modal/form
    - Implement confirmation step: require typing "HAPUS AKUN" exactly
    - Call POST `/api/auth/delete-account` with password and confirmPhrase
    - On success: sign out, clear cookies, redirect to landing page with confirmation message
    - On failure: display error message indicating which step failed
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

  - [x] 13.2 Add "Keluar dari semua perangkat" button to settings page
    - Add button labeled "Keluar dari semua perangkat"
    - Show confirmation dialog before proceeding
    - Call POST `/api/auth/logout-all` on confirmation
    - Disable button and show loading indicator while in progress
    - On success: sign out current session, redirect to login page
    - On failure: display error message in Bahasa Indonesia, keep user on settings page
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The rate limiter module (task 1) is foundational and must be completed before login proxy (task 2) and reset route (task 3)
- Middleware changes (task 4) should be done before UI pages that depend on verification routing
- The callback route update (task 6) must precede OAuth UI (task 7) to handle the OAuth flow correctly
- All API routes use the existing `createServiceClient()` from `lib/supabase/service.ts` for admin operations
- All UI pages follow the existing card-centered layout pattern from login/signup pages
- All user-facing text is in Bahasa Indonesia

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.3", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "7.1", "7.2", "8.1", "8.2", "9.1"] },
    { "id": 4, "tasks": ["11.1", "12.1"] },
    { "id": 5, "tasks": ["11.2", "11.3", "11.4", "12.2", "13.1", "13.2"] }
  ]
}
```
