# Bugfix Requirements Document

## Introduction

The authentication flow in StoryForge has multiple critical bugs and UX gaps that prevent users from completing core auth actions. Login redirect fails silently after successful authentication, password reset flow is broken end-to-end, signup form lacks real-time password validation, Google OAuth has registration/login confusion, and guest users face navigation and access issues. Additionally, the auth UX needs improvements including password strength indicators, show/hide toggles, and navigation gaps (missing logout button on settings, missing settings link in AuthNav). All error messages and UI labels are in Bahasa Indonesia.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user successfully logs in via email/password (server returns 200) THEN the system calls `router.push(redirectPath)` followed by `router.refresh()` but the page does NOT navigate to /analyze because the client-side Next.js router does not pick up the new auth cookies set by the server route, resulting in the user staying on the login page or being redirected back by middleware

1.2 WHEN a user clicks a password recovery link from their email THEN the system fails to establish a session on the /update-password page because the callback route at `/api/auth/callback` only processes requests with a `code` query parameter, but Supabase password recovery links use `token_hash` and `type=recovery` parameters instead, causing the recovery link to fall through to the error redirect

1.3 WHEN a user types mismatched passwords in the signup form THEN the system only validates password match on form submission (not in real-time), providing no visual feedback until the user clicks "Daftar" and sees a generic error message

1.4 WHEN a user tries to log in using Google OAuth but does not have an existing account THEN the system should register them and log them in seamlessly, but instead the flow may fail or not redirect to /analyze with a success message

1.5 WHEN a user fails to log in using Google OAuth and then tries to register using Google OAuth THEN the system redirects the user to the login page with an error (`?error=auth`) instead of allowing the registration to proceed, because the error state from the previous failed attempt persists

1.6 WHEN a guest user is on the login or signup page THEN the system provides no navigation option to continue to the /analyze page as a guest, forcing them to either authenticate or manually type the URL

1.7 WHEN a guest user lands on the analyze page THEN the system may not clearly show the analyze button or input area because the phase starts at 'select-project' for authenticated users and the guest bypass to 'input' phase may not render the BRD input prominently enough

1.8 WHEN a user is on the settings page THEN the system provides no simple "Keluar" (logout) button for the current session — only a "Keluar dari semua perangkat" global logout option exists

1.9 WHEN a user is logged in and viewing the AuthNav component THEN the system shows no link to the settings/pengaturan page, making it unreachable without manually typing the URL

1.10 WHEN a user types a password in the signup or update-password form THEN the system shows no real-time password strength indicator or requirements checklist — only a static hint text and post-submit error

1.11 WHEN a user fills in the signup form with an invalid email format THEN the system relies solely on the browser's native `type="email"` validation with no custom inline feedback on blur

1.12 WHEN a free authenticated user attempts to start an analysis THEN the system shows the 'select-project' phase with a paywall CTA for Company Context, blocking them from proceeding to the input phase without selecting a project

### Expected Behavior (Correct)

2.1 WHEN a user successfully logs in via email/password (server returns 200) THEN the system SHALL perform a hard navigation using `window.location.href = redirectPath` (or call `router.refresh()` before `router.push()`) to ensure the browser sends the newly set auth cookies, resulting in successful redirect to /analyze or the specified redirect parameter

2.2 WHEN a user clicks a password recovery link from their email THEN the system SHALL handle both `code`-based and `token_hash`-based recovery parameters in the callback route, exchange the token for a valid session, and redirect the user to /update-password with an active authenticated session

2.3 WHEN a user types in the confirm password field on the signup form THEN the system SHALL show real-time inline validation indicating whether passwords match (✓ or ✗ indicator) and SHALL disable the submit button until passwords match and all password requirements are met

2.4 WHEN a user tries to log in using Google OAuth but does not have an existing account THEN the system SHALL automatically register the user, log them in, and redirect to /analyze showing a success state

2.5 WHEN a user fails to log in using Google OAuth and then tries to register using Google OAuth THEN the system SHALL clear any previous error state and allow the OAuth registration flow to proceed normally, redirecting to /analyze on success

2.6 WHEN a guest user is on the login or signup page THEN the system SHALL display a clearly visible "Lanjutkan sebagai Tamu" (Continue as Guest) button/link that navigates the user to /analyze without requiring authentication

2.7 WHEN a guest user lands on the analyze page THEN the system SHALL clearly display the BRD input area with the analyze button visible, skipping the project selection phase entirely and showing guest usage counter

2.8 WHEN a user is on the settings page THEN the system SHALL display a simple "Keluar" button that logs out only the current session and redirects to /login

2.9 WHEN a user is logged in and viewing the AuthNav component THEN the system SHALL display a "Pengaturan" link that navigates to /settings

2.10 WHEN a user types a password in the signup or update-password form THEN the system SHALL display a real-time password requirements checklist showing status of each rule (✓ 8+ karakter, ✓ 1 huruf kapital, ✓ 1 angka, ✓ 1 simbol) and a show/hide password toggle

2.11 WHEN a user leaves the email field (on blur) in signup or login forms THEN the system SHALL validate the email format and display an inline error message in Bahasa Indonesia if the format is invalid

2.12 WHEN a free authenticated user attempts to start an analysis THEN the system SHALL allow them to proceed directly to the BRD input phase without being blocked by project selection, respecting the free tier limit of 3 analyses/month

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user logs in via Google OAuth with an existing account THEN the system SHALL CONTINUE TO redirect correctly through the /api/auth/callback route and land on /analyze

3.2 WHEN a user is rate-limited on login attempts THEN the system SHALL CONTINUE TO return a 429 status with appropriate retry-after messaging in Bahasa Indonesia

3.3 WHEN a user submits the signup form with valid matching passwords THEN the system SHALL CONTINUE TO create the account and show the email verification message

3.4 WHEN a user clicks "Keluar dari semua perangkat" on settings THEN the system SHALL CONTINUE TO invalidate all sessions and redirect to login

3.5 WHEN a user accesses a protected route without authentication THEN the system SHALL CONTINUE TO redirect to /login with the original path preserved as a redirect parameter

3.6 WHEN an unverified email-only user tries to access protected routes THEN the system SHALL CONTINUE TO redirect them to /verify-email

3.7 WHEN a user deletes their account via the settings danger zone THEN the system SHALL CONTINUE TO require password verification and "HAPUS AKUN" confirmation phrase

3.8 WHEN a user requests a password reset for a non-existent email THEN the system SHALL CONTINUE TO return 200 (preventing email enumeration) and show the same success message

3.9 WHEN a Pro user selects a project with Company Context before analysis THEN the system SHALL CONTINUE TO pass the project context to the analysis API for enhanced results

3.10 WHEN a guest user exceeds the guest analysis limit THEN the system SHALL CONTINUE TO show the account prompt and block further analyses until they register
