# 2026-04-29: Auth Magic Link Fix

**Date:** 2026-04-29
**Status:** Verified

---

## Completed Tasks

- Fixed signup magic-link flow so successful auth redirects to `/analyze` instead of forcing the set-password step first.
- Kept auth on Supabase built-in SSR/PKCE flow using `@supabase/ssr`.
- Added shared redirect sanitization for login and auth callback redirects.
- Added regression tests for safe auth redirect handling.

## Validation Results

- `npm.cmd test`: 51 tests passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: 4 Playwright tests passed

## Key Decision

- Magic link signup should behave as built-in passwordless auth: once the link is clicked and Supabase exchanges the auth code, the user lands on `/analyze` with an active session.
- Password setup remains available as a separate page, but it is no longer required before first analysis.

## Production Note

- Supabase Auth redirect URLs must include the deployed callback URL, such as `https://storyforge.id/api/auth/callback` and any Vercel preview callback URLs used for testing.
- If Supabase does not allow the callback URL, it can fall back to the configured site URL, which looks like a redirect to the landing page.

## Files Changed

- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/api/auth/callback/route.ts`
- `lib/auth/redirect.ts`
- `tests/lib/auth/redirect.test.ts`

## Next Steps

1. Add the production callback URL to Supabase Auth redirect allowlist.
2. Test a real magic-link signup email on the deployed domain.
3. Decide later whether password login should remain primary or whether login should also support magic-link-only auth.
