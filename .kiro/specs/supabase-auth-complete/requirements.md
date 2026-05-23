# Requirements Document

## Introduction

Complete the StoryForge authentication system with Google OAuth, password recovery, email verification enforcement, brute-force protection, account deletion (UU PDP compliance), and logout-from-all-devices. These features close the remaining gaps for a production-ready auth system targeting Indonesian PMs and vibe coders.

## Glossary

- **Auth_System**: The Supabase-backed authentication layer in StoryForge, including middleware, client/server helpers, and auth UI pages
- **User**: An authenticated individual with a row in `auth.users` and corresponding `profiles`, `usage_counters`, and `subscriptions` records
- **OAuth_Provider**: A third-party identity provider (Google) integrated via Supabase Auth
- **Login_Rate_Limiter**: Server-side mechanism that restricts repeated failed login attempts per IP or email
- **Account_Deletion_Service**: Server-side process that removes all user data from Supabase in compliance with UU PDP
- **Session**: A Supabase auth session represented by JWT refresh/access token pairs stored in cookies
- **Middleware**: Next.js Edge Middleware that validates sessions and enforces route protection
- **Verification_Guard**: Middleware logic that blocks unverified email users from accessing protected routes

## Requirements

### Requirement 1: Google OAuth Login

**User Story:** As a user, I want to sign in with my Google account, so that I can access StoryForge without creating a separate password.

#### Acceptance Criteria

1. WHEN a user clicks the Google login button on the login page, THE Auth_System SHALL initiate the Supabase OAuth flow with Google as the provider and set the redirect URL to `/api/auth/callback`
2. WHEN Google OAuth returns successfully with an authorization code, THE Auth_System SHALL exchange the authorization code for a session via the existing `/api/auth/callback` route and redirect the user to the app dashboard within 5 seconds of the callback being received
3. WHEN a new user signs in via Google OAuth for the first time, THE Auth_System SHALL create profile, usage_counters, and subscriptions records via the existing database trigger and skip the set-password redirect flow
4. WHEN a user signs in via Google OAuth, THE Auth_System SHALL extract the display name from the Google profile and store it in `profiles.full_name`
5. IF the Google profile does not provide a display name, THEN THE Auth_System SHALL store the user's email address prefix (portion before @) as `profiles.full_name`
6. IF Google OAuth returns an error or the user cancels the OAuth consent screen, THEN THE Auth_System SHALL redirect to the login page and display an error message in Bahasa Indonesia indicating that Google login failed
7. THE Auth_System SHALL display the Google login button on both the login page and the signup page

### Requirement 2: Forgot Password / Reset Flow

**User Story:** As a user, I want to reset my password when I forget it, so that I can regain access to my account.

#### Acceptance Criteria

1. THE Auth_System SHALL display a "Lupa password?" link on the login page, positioned below the password input field, that navigates to a dedicated password reset page
2. WHEN a user submits their email on the password reset page, THE Auth_System SHALL call Supabase `resetPasswordForEmail` with a redirect URL pointing to the password update page, regardless of whether the email exists in the system
3. WHEN a user submits their email on the password reset page, THE Auth_System SHALL display the same confirmation message in Bahasa Indonesia indicating the user should check their email, regardless of whether the email is registered, to prevent account enumeration
4. WHEN a user clicks the reset link in their email, THE Auth_System SHALL redirect to the password update page where the user can set a new password with a password field and a confirmation field
5. WHEN a user submits a new password on the update page, THE Auth_System SHALL validate the password using the existing `validatePassword` rules (min 8 chars, 1 uppercase, 1 number, 1 symbol) and verify that the password and confirmation fields match
6. IF password validation fails or the confirmation field does not match on the update page, THEN THE Auth_System SHALL display the specific validation error message in Bahasa Indonesia inline without clearing the form fields
7. WHEN password update succeeds, THE Auth_System SHALL redirect the user to the login page with a success message in Bahasa Indonesia indicating the password has been changed
8. IF the reset token is expired or invalid, THEN THE Auth_System SHALL display an error message in Bahasa Indonesia indicating the link is no longer valid and display a link to navigate back to the password reset page to request a new reset email
9. WHILE the password reset request is being processed, THE Auth_System SHALL disable the submit button and display a loading indicator to prevent duplicate submissions

### Requirement 3: Email Verification Enforcement

**User Story:** As a product owner, I want unverified email users blocked from using the app, so that only legitimate users consume analysis quota.

#### Acceptance Criteria

1. WHILE a user's email is not verified (email_confirmed_at is null) AND the user signed up via email (not OAuth), THE Middleware SHALL redirect the user to the verification pending page instead of allowing access to protected routes (/analyze/*, /dashboard, /settings, /set-password)
2. WHILE a user is on the verification pending page, THE Auth_System SHALL display a message instructing the user to check their inbox for a verification link, and SHALL display a resend verification button
3. WHEN a user clicks the resend verification button, THE Auth_System SHALL call Supabase `resend` with type `signup` for the user's email and SHALL display a confirmation message indicating the email was sent
4. IF the resend verification request fails, THEN THE Auth_System SHALL display an error message indicating the resend failed and SHALL keep the resend button enabled for retry
5. WHEN a user clicks the resend verification button, THE Auth_System SHALL disable the resend button for 60 seconds to prevent repeated requests
6. WHEN a user who has completed email verification navigates to any protected route or refreshes the verification pending page, THE Middleware SHALL detect the updated email_confirmed_at value via session refresh and allow access to protected routes
7. IF a user authenticated via an OAuth provider (app_metadata.providers contains a provider other than "email"), THEN THE Middleware SHALL bypass the email verification check and allow access to protected routes regardless of email_confirmed_at value

### Requirement 4: Brute-Force Protection on Auth Endpoints

**User Story:** As a product owner, I want login attempts rate-limited, so that attackers cannot brute-force user passwords.

#### Acceptance Criteria

1. WHEN a client IP exceeds 5 failed login attempts within a 15-minute sliding window, THE Login_Rate_Limiter SHALL reject subsequent login attempts with HTTP 429 and a `retry-after` header indicating the number of seconds remaining until the window resets
2. WHEN a client IP exceeds 3 password reset requests within a 15-minute sliding window, THE Login_Rate_Limiter SHALL reject subsequent reset requests with HTTP 429 and a `retry-after` header indicating the number of seconds remaining until the window resets
3. THE Login_Rate_Limiter SHALL use in-memory sliding window counters with a 15-minute window duration and a MAX_ENTRIES pruning threshold of 5000, matching the `guest-rate-limit.ts` Map-based bucket pattern
4. WHEN a login attempt is rate-limited, THE Auth_System SHALL display a message in Bahasa Indonesia stating the number of minutes remaining before the user can retry
5. THE Login_Rate_Limiter SHALL track attempts by IP address extracted from the first value in the `x-forwarded-for` header (Vercel deployment), falling back to "unknown" if the header is absent
6. WHEN the 15-minute sliding window elapses since the first tracked attempt for a given IP, THE Login_Rate_Limiter SHALL reset that IP's attempt counter to zero, allowing new attempts
7. IF a login request returns an authentication error from Supabase Auth (invalid credentials or non-existent user), THEN THE Login_Rate_Limiter SHALL increment the failed attempt counter for that client IP

### Requirement 5: Account Deletion (UU PDP Compliance)

**User Story:** As a user, I want to delete my account and all associated data, so that I can exercise my right to erasure under UU PDP.

#### Acceptance Criteria

1. THE Auth_System SHALL provide an account deletion button on the settings page, visually distinct from other actions and labeled with a destructive-action indicator
2. WHEN a user initiates account deletion, THE Auth_System SHALL require the user to re-authenticate with their current password before presenting the confirmation step
3. WHEN re-authentication succeeds, THE Auth_System SHALL require the user to type the exact confirmation phrase "HAPUS AKUN" (case-sensitive) before proceeding
4. WHEN account deletion is confirmed, THE Account_Deletion_Service SHALL delete all user data from the following tables in order: analyze_sessions, analysis_history, analysis_events, projects, company_context, saved_clarifications, usage_counters, subscriptions, and profiles, completing the entire operation within 30 seconds
5. WHEN all table deletions succeed, THE Account_Deletion_Service SHALL call Supabase Admin API to delete the user from `auth.users`
6. WHEN account deletion completes successfully, THE Auth_System SHALL sign out the user, clear all session cookies, and redirect to the landing page with a visible confirmation message indicating the account has been deleted
7. IF any table deletion or auth.users deletion fails, THEN THE Account_Deletion_Service SHALL roll back all previously completed deletions within the same transaction, preserve the user's session, and display an error message indicating which step failed and that no data was removed
8. IF the deletion operation exceeds 30 seconds, THEN THE Account_Deletion_Service SHALL abort the operation, roll back all changes, and display an error message indicating a timeout occurred
9. THE Account_Deletion_Service SHALL execute all deletion operations via a server-side API route using the service role client for admin-level access, bypassing RLS policies

### Requirement 6: Logout from All Devices

**User Story:** As a user, I want to sign out from all devices at once, so that I can secure my account if a device is lost or compromised.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a "Keluar dari semua perangkat" button on the settings page
2. WHEN a user clicks the "Keluar dari semua perangkat" button, THE Auth_System SHALL display a confirmation dialog asking the user to confirm the global logout action before proceeding
3. WHEN the user confirms the global logout, THE Auth_System SHALL call the Supabase Admin API via a server-side API route to invalidate all refresh tokens for that user, with a maximum response timeout of 15 seconds
4. WHEN global logout completes successfully, THE Auth_System SHALL sign out the current session, clear cookies, and redirect to the login page
5. THE Auth_System SHALL use the `SUPABASE_SERVICE_ROLE_KEY` via a server-side API route to perform the global sign-out operation
6. IF the global logout API call fails or exceeds 15 seconds, THEN THE Auth_System SHALL display an error message in Bahasa Indonesia indicating the logout operation failed, keep the user on the settings page, and preserve the current session
7. WHILE the global logout operation is in progress, THE Auth_System SHALL disable the "Keluar dari semua perangkat" button and display a loading indicator
