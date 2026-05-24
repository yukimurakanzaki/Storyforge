# Auth Flow Fixes — Bugfix Design

## Overview

The StoryForge authentication flow has 12 defects spanning login redirect failures, broken password reset, missing UX feedback, navigation gaps, and access control issues. The root causes are: (1) client-side router not picking up server-set cookies after login, (2) callback route only handling `code` params while Supabase recovery uses `token_hash`/`type`, (3) missing real-time validation UI components, (4) missing navigation links and buttons, and (5) incorrect phase gating for free users. The fix strategy is minimal and targeted — each defect maps to a specific file change with no architectural refactoring.

## Glossary

- **Bug_Condition (C)**: The set of conditions across 12 defects where auth flows fail or UX is missing — login redirect doesn't navigate, recovery links fail, validation is post-submit only, navigation links are absent, and free users are blocked
- **Property (P)**: The desired behavior — successful navigation after login, working password reset, real-time validation feedback, complete navigation, and unblocked free-tier access
- **Preservation**: Existing behaviors that must remain unchanged — Google OAuth flow, rate limiting, account deletion, email verification guard, Pro user project selection, guest usage limits
- **`handlePasswordLogin`**: The function in `app/(auth)/login/page.tsx` that calls `/api/auth/login` and then attempts client-side navigation
- **`GET /api/auth/callback`**: The route in `app/api/auth/callback/route.ts` that exchanges auth codes for sessions
- **`validatePassword`**: The function in `lib/auth/password.ts` that checks password requirements
- **`AuthNav`**: The component in `components/AuthNav.tsx` that renders authenticated user navigation
- **`AnalyzePage`**: The page in `app/(app)/analyze/page.tsx` that gates analysis behind project selection

## Bug Details

### Bug Condition

The bugs manifest across 6 distinct interaction paths in the auth system. The combined bug condition covers: (1) successful email/password login that fails to navigate, (2) password recovery links that cannot establish sessions, (3) password/email fields with no real-time validation, (4) settings page missing simple logout and AuthNav missing settings link, (5) free users blocked by project selection, and (6) guest users with no navigation path from auth pages.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserAuthInteraction
  OUTPUT: boolean
  
  RETURN (input.action == 'email_login' AND input.serverResponse == 200 AND input.navigationMethod == 'router.push')
         OR (input.action == 'password_recovery_click' AND input.urlParams.has('token_hash') AND NOT input.urlParams.has('code'))
         OR (input.action == 'typing_password' AND input.context IN ['signup', 'update-password'] AND input.expectsRealtimeFeedback)
         OR (input.action == 'typing_email' AND input.event == 'blur' AND input.expectsInlineValidation)
         OR (input.action == 'view_settings' AND input.expectsSimpleLogout AND NOT input.hasSimpleLogoutButton)
         OR (input.action == 'view_authnav' AND input.isAuthenticated AND NOT input.hasSettingsLink)
         OR (input.action == 'start_analysis' AND input.userPlan == 'free' AND input.phase == 'select-project' AND input.isBlocked)
         OR (input.action == 'view_auth_page' AND input.isGuest AND NOT input.hasGuestContinueLink)
END FUNCTION
```

### Examples

- **Defect 1.1**: User enters correct credentials → server returns 200 → `router.push('/analyze')` + `router.refresh()` → page stays on /login because middleware doesn't see the new cookies in the client-side navigation request
- **Defect 1.2**: User clicks recovery email link with `?token_hash=abc&type=recovery` → callback route checks `searchParams.get('code')` → code is null → falls through to error redirect `/login?error=auth`
- **Defect 1.3/1.10**: User types "Pass1" in password field → no visual feedback about missing requirements → only sees error after clicking submit
- **Defect 1.8**: User on /settings wants to log out current session → only option is "Keluar dari semua perangkat" (global logout)
- **Defect 1.9**: User is logged in, looks at AuthNav → no "Pengaturan" link visible → must type /settings manually
- **Defect 1.12**: Free user clicks "Analisis Baru" → lands on `select-project` phase → `handleProjectSelect` shows paywall CTA → user is stuck

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Google OAuth login/signup flow through `/api/auth/callback` with `code` parameter must continue to work exactly as before
- Rate limiting on login attempts (429 responses) must remain unchanged
- Account deletion flow (password verification + "HAPUS AKUN" confirmation) must remain unchanged
- Email verification guard for unverified email-only users must remain unchanged
- Middleware redirect logic for protected routes must remain unchanged
- Pro user project selection with Company Context must continue to pass project context to analysis API
- Guest usage limits and account prompt behavior must remain unchanged
- "Keluar dari semua perangkat" global logout must continue to work
- Signup form submission with valid data must continue to create accounts and show verification message

**Scope:**
All inputs that do NOT involve the 12 specific defect conditions should be completely unaffected by these fixes. This includes:
- Existing Google OAuth callback handling (code-based)
- Rate-limited login responses
- Account deletion flow
- Pro user project selection workflow
- Guest analysis limit enforcement
- Email verification redirects

## Hypothesized Root Cause

Based on the bug analysis and code review, the root causes are:

1. **Login Redirect (Defect 1.1)**: In `app/(auth)/login/page.tsx`, `handlePasswordLogin` calls `router.push(redirectPath)` then `router.refresh()` after the server proxy returns 200. The Next.js App Router client-side navigation does NOT trigger a full page reload, so the browser never sends the newly set `Set-Cookie` headers from the server response to the middleware on the next navigation. The middleware sees no auth cookies and redirects back to /login.

2. **Password Reset (Defect 1.2)**: In `app/api/auth/callback/route.ts`, the GET handler only checks `searchParams.get('code')`. Supabase password recovery with PKCE flow puts recovery tokens in the URL that the Supabase client SDK auto-detects. The `/update-password` page calls `supabase.auth.getUser()` but does NOT call `supabase.auth.getSession()` first — which is what triggers the SDK to detect and exchange recovery params from the URL hash/query.

3. **Real-time Validation (Defects 1.3, 1.10, 1.11)**: The signup and update-password pages use `validatePassword()` only on form submission. No `PasswordStrengthChecklist` component exists. Password inputs have `type="password"` with no show/hide toggle. Email validation relies solely on browser-native `type="email"`.

4. **Navigation Gaps (Defects 1.8, 1.9)**: The settings page only has "Keluar dari semua perangkat" — no simple single-session logout button. The `AuthNav` component renders Dashboard link and Keluar button but no "Pengaturan" link.

5. **Free User Blocking (Defect 1.12)**: In `app/(app)/analyze/page.tsx`, authenticated users always start at `phase='select-project'`. The `handleProjectSelect` function checks `if (isAuthenticated && (!userPlan || userPlan === 'free'))` and shows paywall CTA, blocking free users entirely.

6. **Guest Navigation (Defects 1.6, 1.7)**: Login and signup pages have no "Lanjutkan sebagai Tamu" link. The analyze page already handles guests correctly (sets phase to 'input' when not authenticated), but there's no way to reach it from auth pages without typing the URL.

## Correctness Properties

Property 1: Bug Condition - Login Hard Navigation

_For any_ successful email/password login (server returns 200), the fixed `handlePasswordLogin` function SHALL perform a hard navigation using `window.location.href` that forces the browser to send newly set auth cookies, resulting in successful redirect to the target path.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Password Recovery Token Handling

_For any_ password recovery link click where the URL contains `token_hash` and `type=recovery` parameters, the fixed callback route or update-password page SHALL successfully exchange the recovery token for a session and render the password update form.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Real-time Password Validation

_For any_ password input change in signup or update-password forms, the fixed UI SHALL display a real-time checklist showing pass/fail status for each requirement (8+ chars, 1 uppercase, 1 number, 1 symbol) and a show/hide toggle.

**Validates: Requirements 2.3, 2.10**

Property 4: Bug Condition - Email Inline Validation

_For any_ email field blur event with an invalid email format, the fixed UI SHALL display an inline error message in Bahasa Indonesia.

**Validates: Requirements 2.11**

Property 5: Bug Condition - Settings Simple Logout and AuthNav Settings Link

_For any_ authenticated user viewing the settings page, the fixed UI SHALL display a "Keluar" button for single-session logout. _For any_ authenticated user viewing AuthNav, the fixed component SHALL display a "Pengaturan" link to /settings.

**Validates: Requirements 2.8, 2.9**

Property 6: Bug Condition - Free User Direct Input Access

_For any_ free authenticated user starting an analysis, the fixed analyze page SHALL skip project selection and proceed directly to the BRD input phase.

**Validates: Requirements 2.12**

Property 7: Bug Condition - Guest Navigation Links

_For any_ guest user viewing login or signup pages, the fixed UI SHALL display a "Lanjutkan sebagai Tamu" link that navigates to /analyze.

**Validates: Requirements 2.6**

Property 8: Preservation - Existing Auth Flows Unchanged

_For any_ input where the bug condition does NOT hold (Google OAuth with code param, rate-limited requests, account deletion, Pro user project selection, guest limits, email verification), the fixed code SHALL produce the same result as the original code, preserving all existing authentication and authorization behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Fix 1 — Login Redirect**

**File**: `app/(auth)/login/page.tsx`
**Function**: `handlePasswordLogin`

**Specific Changes**:
1. Replace `router.push(redirectPath); router.refresh()` with `window.location.href = redirectPath`
2. This forces a full page load where the browser sends the newly set cookies to the server

---

**Fix 2 — Password Recovery Flow**

**File**: `app/(auth)/update-password/page.tsx`
**Function**: `useEffect` (session check on mount)

**Specific Changes**:
1. Change the mount effect to call `supabase.auth.getSession()` instead of `supabase.auth.getUser()`
2. `getSession()` triggers the Supabase client SDK to detect recovery params in the URL (hash fragments or query params) and auto-exchange them for a session
3. If session exists after `getSession()`, set `sessionReady = true`
4. Also add handling in callback route for `token_hash` + `type` params as a fallback path

**File**: `app/api/auth/callback/route.ts`
**Function**: `GET`

**Specific Changes**:
1. After the `if (code)` block, add an `else if` for `token_hash` + `type=recovery`
2. Use `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` to exchange the token
3. On success, redirect to `/update-password`

---

**Fix 3 — Real-time Password Validation**

**New File**: `components/PasswordStrengthChecklist.tsx`

**Specific Changes**:
1. Create a `PasswordStrengthChecklist` component that accepts `password: string` prop
2. Show 4 requirement indicators with ✓/✗: 8+ karakter, 1 huruf kapital, 1 angka, 1 simbol
3. Add show/hide password toggle button (eye icon)
4. Add email validation on blur with inline error in Bahasa Indonesia

**Files**: `app/(auth)/signup/page.tsx`, `app/(auth)/update-password/page.tsx`

**Specific Changes**:
1. Import and render `PasswordStrengthChecklist` below password input
2. Add `showPassword` state and toggle for password inputs
3. Add confirm password match indicator (real-time ✓/✗)
4. Add email `onBlur` handler with format validation and inline error state

---

**Fix 4 — Settings Logout + AuthNav Link**

**File**: `app/(app)/settings/page.tsx`

**Specific Changes**:
1. Add a "Keluar" button in the Security section (above the global logout)
2. Button calls `supabase.auth.signOut()` then redirects to `/login`

**File**: `components/AuthNav.tsx`

**Specific Changes**:
1. Add a `<Link href="/settings">Pengaturan</Link>` in the authenticated user nav, between Dashboard and email/Keluar

---

**Fix 5 — Free User Project Selection Bypass**

**File**: `app/(app)/analyze/page.tsx`

**Specific Changes**:
1. In the `useEffect` that checks auth state, after determining `userPlan === 'free'`, set `phase` to `'input'` directly (skip `select-project`)
2. Only keep `select-project` as initial phase for Pro users
3. Add a "Lewati" (Skip) button on the project selector for free users as alternative

---

**Fix 6 — Guest Navigation**

**Files**: `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`

**Specific Changes**:
1. Add a "Lanjutkan sebagai Tamu" link below the login/signup form
2. Link navigates to `/analyze`
3. Style as secondary text link consistent with existing design

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate each defect scenario and assert the expected behavior fails on unfixed code.

**Test Cases**:
1. **Login Redirect Test**: After successful `/api/auth/login` call, verify that `router.push` is called (will demonstrate the bug — cookies not sent on client navigation)
2. **Recovery Link Test**: Simulate GET to `/api/auth/callback?token_hash=abc&type=recovery` — verify it falls through to error redirect (will fail on unfixed code)
3. **Password Validation Test**: Render signup form, type partial password — verify no checklist component renders (will demonstrate missing UI)
4. **Settings Logout Test**: Render settings page — verify no simple "Keluar" button exists (will demonstrate missing button)
5. **Free User Blocking Test**: Render analyze page as free user — verify phase starts at 'select-project' and handleProjectSelect shows paywall (will demonstrate blocking)
6. **Guest Link Test**: Render login page — verify no "Lanjutkan sebagai Tamu" link exists (will demonstrate missing link)

**Expected Counterexamples**:
- Login succeeds but navigation fails (cookies not sent)
- Recovery callback returns redirect to `/login?error=auth`
- No `PasswordStrengthChecklist` component in DOM
- No simple logout button on settings page
- Free users see paywall CTA on project select

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedAuthFlow(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalAuthFlow(input) = fixedAuthFlow(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various auth states, URL params, user plans)
- It catches edge cases that manual unit tests might miss (e.g., unusual URL param combinations)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Google OAuth, rate limiting, account deletion, and Pro user flows, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Google OAuth Preservation**: Verify that callback with `code` param continues to exchange for session and redirect correctly
2. **Rate Limit Preservation**: Verify that 429 responses continue to be returned with correct retry-after
3. **Account Deletion Preservation**: Verify that delete flow still requires password + confirmation phrase
4. **Pro User Project Selection Preservation**: Verify Pro users still see project selector and can pass context to analysis
5. **Middleware Redirect Preservation**: Verify unauthenticated users still get redirected to /login with redirect param
6. **Guest Limit Preservation**: Verify guest usage counter still blocks after limit reached

### Unit Tests

- Test `window.location.href` assignment after successful login API call
- Test callback route handling of `token_hash` + `type=recovery` params
- Test `PasswordStrengthChecklist` component renders correct indicators for various password inputs
- Test email validation on blur shows/hides error message
- Test settings page renders simple "Keluar" button
- Test AuthNav renders "Pengaturan" link when authenticated
- Test analyze page sets phase to 'input' for free users
- Test login/signup pages render "Lanjutkan sebagai Tamu" link

### Property-Based Tests

- Generate random password strings and verify `PasswordStrengthChecklist` correctly shows pass/fail for each requirement
- Generate random email strings and verify inline validation correctly identifies valid/invalid formats
- Generate random auth states (guest, free, pro) and verify correct phase initialization on analyze page
- Generate random URL param combinations for callback route and verify correct routing (code → exchange, token_hash → verify, neither → error)

### Integration Tests

- Test full login flow: enter credentials → API call → hard navigation → middleware passes → /analyze renders
- Test full password reset flow: request reset → click link → session established → update password → redirect to login
- Test signup with real-time validation: type password → see checklist update → confirm match → submit
- Test free user flow: login → land on /analyze input phase directly → submit BRD → analysis runs
- Test guest flow: visit /login → click "Lanjutkan sebagai Tamu" → /analyze input phase renders
