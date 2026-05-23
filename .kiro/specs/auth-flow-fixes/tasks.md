# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Auth Flow Defects Across 6 Fix Groups
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fixes when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist across all 6 fix groups
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each defect group:
    - Login redirect: after successful `/api/auth/login` (200), assert `window.location.href` is assigned (currently uses `router.push`)
    - Callback route: GET `/api/auth/callback?token_hash=abc&type=recovery` should redirect to `/update-password` (currently falls through to error)
    - Password validation: render signup form, type partial password, assert `PasswordStrengthChecklist` component renders (currently missing)
    - Settings logout: render settings page, assert simple "Keluar" button exists (currently missing)
    - AuthNav settings link: render AuthNav as authenticated user, assert "Pengaturan" link exists (currently missing)
    - Free user access: render analyze page as free user, assert phase is 'input' not 'select-project' (currently blocked)
    - Guest navigation: render login page, assert "Lanjutkan sebagai Tamu" link exists (currently missing)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.8, 1.9, 1.10, 1.12_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Auth Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Observe: GET `/api/auth/callback?code=valid_code` exchanges code for session and redirects to /analyze
    - Observe: POST `/api/auth/login` with invalid credentials returns 401
    - Observe: POST `/api/auth/login` when rate-limited returns 429 with retryAfter
    - Observe: Settings page renders "Keluar dari semua perangkat" button and account deletion flow
    - Observe: Pro user on analyze page starts at 'select-project' phase and can pass project context
    - Observe: Guest user exceeding limit sees account prompt and is blocked
    - Observe: Signup form with valid matching passwords creates account and shows verification message
  - Write property-based tests:
    - For all callback requests with valid `code` param, response redirects correctly (not to error)
    - For all login attempts with wrong credentials, response is 401
    - For all rate-limited requests, response is 429 with retryAfter field
    - For all authenticated users on settings, "Keluar dari semua perangkat" button and deletion flow render
    - For all Pro users on analyze page, phase starts at 'select-project' with project selector
    - For all guests exceeding limit, account prompt shows and analysis is blocked
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 3. Fix login redirect (one-line change)

  - [x] 3.1 Replace router.push with window.location.href in login page
    - In `app/(auth)/login/page.tsx`, function `handlePasswordLogin`
    - Replace `router.push(redirectPath); router.refresh()` with `window.location.href = redirectPath`
    - This forces a full page load so the browser sends newly set auth cookies to middleware
    - _Bug_Condition: isBugCondition(input) where input.action == 'email_login' AND input.serverResponse == 200 AND input.navigationMethod == 'router.push'_
    - _Expected_Behavior: Hard navigation via window.location.href ensures cookies are sent on next request_
    - _Preservation: Google OAuth flow through callback route must continue to work unchanged_
    - _Requirements: 2.1, 3.1, 3.5_

- [x] 4. Fix password reset flow (callback route + update-password page)

  - [x] 4.1 Add token_hash + type=recovery handling in callback route
    - In `app/api/auth/callback/route.ts`, after the `if (code)` block
    - Add `else if` for `token_hash` + `type === 'recovery'` params
    - Use `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` to exchange token
    - On success, redirect to `/update-password`
    - On failure, redirect to `/login?error=auth`
    - _Bug_Condition: isBugCondition(input) where input.action == 'password_recovery_click' AND input.urlParams.has('token_hash') AND NOT input.urlParams.has('code')_
    - _Expected_Behavior: Recovery token is exchanged for session, user lands on /update-password_
    - _Preservation: Existing code-based callback handling must remain unchanged_
    - _Requirements: 2.2, 3.1_

  - [x] 4.2 Fix update-password page to use getSession()
    - In `app/(auth)/update-password/page.tsx`, change mount effect
    - Replace `supabase.auth.getUser()` with `supabase.auth.getSession()`
    - `getSession()` triggers the Supabase SDK to detect recovery params in URL hash/query and auto-exchange them
    - If session exists, set `sessionReady = true`; otherwise show "Link Tidak Valid" state
    - _Requirements: 2.2_

- [x] 5. Create PasswordStrengthChecklist component (foundational — used by signup + update-password)

  - [x] 5.1 Create components/PasswordStrengthChecklist.tsx
    - Accept props: `password: string`, `showPassword: boolean`, `onToggleShow: () => void`
    - Display 4 requirement indicators with ✓/✗ icons:
      - ✓/✗ Minimal 8 karakter
      - ✓/✗ 1 huruf kapital
      - ✓/✗ 1 angka
      - ✓/✗ 1 simbol
    - Each indicator turns green (✓) when requirement is met, gray (✗) when not
    - Include show/hide password toggle button (eye/eye-off icon)
    - Optionally accept `confirmPassword: string` prop to show match indicator (✓ Cocok / ✗ Tidak cocok)
    - Use Tailwind classes consistent with existing auth page styling
    - Export as named export for reuse
    - _Requirements: 2.3, 2.10_

- [x] 6. Update signup and update-password pages with PasswordStrengthChecklist

  - [x] 6.1 Add PasswordStrengthChecklist to signup page
    - In `app/(auth)/signup/page.tsx`:
    - Add `showPassword` and `showConfirm` state variables
    - Change password input `type` to toggle between "password" and "text" based on state
    - Import and render `<PasswordStrengthChecklist>` below password input
    - Add real-time confirm password match indicator (✓/✗) below confirm input
    - Add `emailError` state and `onBlur` handler on email input for format validation
    - Show inline error "Format email tidak valid" on blur if email format is invalid
    - Disable submit button until all password requirements met AND passwords match
    - _Bug_Condition: isBugCondition(input) where input.action == 'typing_password' AND input.context == 'signup'_
    - _Expected_Behavior: Real-time checklist updates on every keystroke, confirm match shows ✓/✗_
    - _Preservation: Signup form submission with valid data must continue to create accounts_
    - _Requirements: 2.3, 2.10, 2.11, 3.3_

  - [x] 6.2 Add PasswordStrengthChecklist to update-password page
    - In `app/(auth)/update-password/page.tsx`:
    - Add `showPassword` and `showConfirm` state variables
    - Change password input `type` to toggle based on state
    - Import and render `<PasswordStrengthChecklist>` below password input
    - Add real-time confirm password match indicator below confirm input
    - Disable submit button until all requirements met AND passwords match
    - _Requirements: 2.3, 2.10_

- [x] 7. Fix settings page + AuthNav navigation

  - [x] 7.1 Add simple logout button to settings page
    - In `app/(app)/settings/page.tsx`, Security section
    - Add a "Keluar" button ABOVE the "Keluar dari semua perangkat" button
    - Button calls `supabase.auth.signOut()` then `window.location.href = '/login'`
    - Style as secondary button consistent with existing design
    - Add brief description: "Keluar dari sesi ini saja."
    - _Bug_Condition: isBugCondition(input) where input.action == 'view_settings' AND NOT input.hasSimpleLogoutButton_
    - _Expected_Behavior: Simple logout button exists and logs out current session only_
    - _Preservation: "Keluar dari semua perangkat" must continue to work unchanged_
    - _Requirements: 2.8, 3.4_

  - [x] 7.2 Add "Pengaturan" link to AuthNav component
    - In `components/AuthNav.tsx`, authenticated user section
    - Add `<Link href="/settings">Pengaturan</Link>` between Dashboard link and email/Keluar
    - Style consistent with existing nav links (text-sm text-gray-500 hover:text-gray-800)
    - _Bug_Condition: isBugCondition(input) where input.action == 'view_authnav' AND input.isAuthenticated AND NOT input.hasSettingsLink_
    - _Expected_Behavior: "Pengaturan" link renders and navigates to /settings_
    - _Requirements: 2.9_

- [x] 8. Fix free user access + guest navigation

  - [x] 8.1 Skip project selection for free authenticated users
    - In `app/(app)/analyze/page.tsx`, in the `useEffect` that checks auth state
    - After determining `userPlan === 'free'`, set `phase` to `'input'` directly
    - Only keep `select-project` as initial phase for Pro users
    - Free users land directly on BRD input phase, respecting 3 analyses/month limit
    - _Bug_Condition: isBugCondition(input) where input.action == 'start_analysis' AND input.userPlan == 'free' AND input.phase == 'select-project'_
    - _Expected_Behavior: Free users skip project selection and see BRD input immediately_
    - _Preservation: Pro users must continue to see project selector with Company Context_
    - _Requirements: 2.12, 3.9_

  - [x] 8.2 Add "Lanjutkan sebagai Tamu" link to login and signup pages
    - In `app/(auth)/login/page.tsx`: add link below the "Belum punya akun?" text
    - In `app/(auth)/signup/page.tsx`: add link below the "Sudah punya akun?" text
    - Link text: "Lanjutkan sebagai Tamu"
    - Link navigates to `/analyze`
    - Style as secondary text link: `text-sm text-gray-500 hover:text-teal-600`
    - _Bug_Condition: isBugCondition(input) where input.action == 'view_auth_page' AND input.isGuest AND NOT input.hasGuestContinueLink_
    - _Expected_Behavior: "Lanjutkan sebagai Tamu" link is visible and navigates to /analyze_
    - _Preservation: Guest usage limits must continue to be enforced on /analyze_
    - _Requirements: 2.6, 3.10_

- [x] 9. Fix additional edge cases and negative cases (from audit)

  - [x] 9.1 Fix signup redirect same cookie bug as login
    - In `app/(auth)/signup/page.tsx`, function `handleSubmit`
    - Replace `router.push(redirectPath); router.refresh()` with `window.location.href = redirectPath`
    - Same root cause as login: client-side router doesn't send newly set cookies
    - _Requirements: 2.1_

  - [x] 9.2 Fix reset password redirectTo URL (wrong target)
    - In `app/api/auth/reset-password/route.ts`
    - Change `redirectTo` from `${origin}/api/auth/callback?type=recovery` to `${origin}/update-password`
    - Supabase appends its own params (token_hash, type) to the redirectTo URL
    - The Supabase client SDK on /update-password will auto-detect and exchange the token
    - _Requirements: 2.2_

  - [x] 9.3 Add password-updated success message on login page
    - In `app/(auth)/login/page.tsx`, read `?message=password-updated` from searchParams
    - Show green success banner: "Password berhasil diubah. Silakan login dengan password baru."
    - Clear the message param after displaying (or just show it once)
    - _Requirements: 2.7_

  - [x] 9.4 Add loading state to Google OAuth button on signup page
    - In `app/(auth)/signup/page.tsx`, add `oauthLoading` state
    - Disable button and show "Menghubungkan..." while OAuth redirect is in progress
    - Match the pattern already used on the login page
    - _Requirements: UX consistency_

  - [x] 9.5 Fix login API unhandled JSON parse error
    - In `app/api/auth/login/route.ts`
    - Wrap `await request.json()` in try/catch
    - Return 400 with `{ error: 'Request body tidak valid.' }` on parse failure
    - Match the pattern used in delete-account route
    - _Requirements: Error handling_

  - [x] 9.6 Map signup existing-email error to Bahasa Indonesia
    - In `app/(auth)/signup/page.tsx`, in the error handling after `supabase.auth.signUp`
    - Check if `error.message` contains "User already registered" or similar
    - Map to: "Email sudah terdaftar. Silakan login atau gunakan email lain."
    - _Requirements: UX, Bahasa Indonesia_

  - [x] 9.7 Fix verify-email page Supabase client creation outside lifecycle
    - In `app/(auth)/verify-email/page.tsx`
    - Move `createClient()` call inside the useEffect or use a lazy initialization pattern
    - Current code creates client during render which can cause issues in React strict mode
    - _Requirements: React best practices_

  - [x] 9.8 Add forgot-password to middleware isAuthPage list
    - In `lib/supabase/middleware.ts`, add `pathname.startsWith('/forgot-password')` to `isAuthPage` check
    - Also add `/update-password` to prevent logged-in users from accessing these pages unnecessarily
    - This redirects already-logged-in users away from forgot-password/update-password to /analyze
    - _Requirements: UX consistency_

  - [x] 9.9 Add email format validation to login API route
    - In `app/api/auth/login/route.ts`, after checking `!email || !password`
    - Add basic email regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
    - Return 400 with `{ error: 'Format email tidak valid.' }` if invalid
    - Prevents unnecessary Supabase calls for obviously invalid emails
    - _Requirements: Input validation_

- [x] 10. Verify all fixes

  - [x] 10.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Auth Flow Defects Resolved
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior for all 6 fix groups
    - When this test passes, it confirms all bug conditions are resolved:
      - Login uses `window.location.href` ✓
      - Callback handles `token_hash` + `type=recovery` ✓
      - `PasswordStrengthChecklist` renders in signup/update-password ✓
      - Settings has simple "Keluar" button ✓
      - AuthNav has "Pengaturan" link ✓
      - Free users skip project selection ✓
      - Login/signup have "Lanjutkan sebagai Tamu" link ✓
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.8, 2.9, 2.10, 2.12_

  - [x] 10.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Auth Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions):
      - Google OAuth callback with `code` param still works ✓
      - Rate limiting still returns 429 ✓
      - Account deletion flow unchanged ✓
      - Pro user project selection unchanged ✓
      - Guest usage limits still enforced ✓
      - Middleware redirects still work ✓

- [x] 11. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify TypeScript compiles cleanly
  - Verify all fix groups are working correctly
  - Ensure all tests pass, ask the user if questions arise
