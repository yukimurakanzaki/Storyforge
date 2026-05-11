# StoryForge Password Auth and Admin Beta Magic Link Design

## Context

StoryForge currently allows public guests to use the base `/analyze` page, while account-bound pages such as saved analysis details, dashboard, settings, and password setup are protected. Public signup uses Supabase magic link. Login already has a password mode, but newly registered users may never create a password because password setup is optional and the callback only guesses first login by checking whether `auth.users.created_at` is less than five minutes old.

The new product direction is:

- Guests may still use `/analyze`.
- Registered users must use standard email and password auth.
- Registered users default to the Free category.
- Magic link stays available only for admin-controlled beta tester access, hidden from public signup and login.

## Goals

- Make public registration feel like a standard modern SaaS flow: email, password, confirm password, then enter the product.
- Make public login password-first and remove visible magic-link login controls.
- Preserve a hidden admin-only path for sending beta magic links when needed.
- Keep product access rules clear: role controls internal permissions; subscription plan controls Free or Pro product access.
- Avoid exposing any privileged Supabase service-role behavior to the browser.

## Non-Goals

- Do not build a full admin dashboard in this auth conversion unless explicitly planned as a follow-up.
- Do not add payment or Pro upgrade behavior.
- Do not remove guest analysis mode.
- Do not require social login.

## Proposed Model

Use two separate concepts:

- `profiles.role`: internal authorization, starting with `user` and `admin`.
- `subscriptions.plan`: product entitlement, already represented as `free` and `pro`.

Every new Supabase auth user continues to receive:

- `profiles.role = 'user'`
- `subscriptions.plan = 'free'`
- `subscriptions.status = 'active'`

The founder account is promoted manually once through Supabase SQL:

```sql
update profiles
set role = 'admin'
where id = '<founder-auth-user-uuid>';
```

If the project later stores email on `profiles`, promotion can use email instead, but the current schema only stores profile id and full name.

## Public Auth Flow

### Signup

`/signup` becomes an email and password registration page:

- Email input.
- Password input.
- Confirm password input.
- Client-side password validation consistent with the existing `/set-password` rules.
- Calls `supabase.auth.signUp({ email, password })`.
- On success, redirects to `/analyze` or the safe intended internal redirect.

If Supabase email confirmation is enabled in the dashboard, the page shows a "check your email" state. If confirmation is disabled for beta speed, Supabase returns a session and the user can enter immediately. The UI should handle both outcomes.

### Login

`/login` becomes email and password only:

- Email input.
- Password input.
- Submit calls `supabase.auth.signInWithPassword({ email, password })`.
- On success, redirects to the sanitized intended route or `/analyze`.
- Magic-link controls are removed from public UI.

Password reset can be added later as a normal "Lupa password?" flow using Supabase recovery emails.

## Admin Beta Magic Link Flow

Magic link remains supported but hidden from public users. The initial implementation should keep the existing OTP capability out of public UI and reserve it for a future admin-only route.

When the admin route is built, it should:

- Require an authenticated user.
- Load the current user's profile server-side.
- Allow access only when `profiles.role = 'admin'`.
- Send beta magic links from a server route, not from public client code.
- Use `shouldCreateUser: true` only for explicit beta invite actions.

This allows the founder to invite beta testers without exposing magic-link signup as the default public path.

## Authorization Helpers

Add a small server-side helper for admin checks:

- `requireUser()` returns the authenticated Supabase user or redirects/returns unauthorized.
- `requireAdmin()` loads the profile for the authenticated user and confirms `role = 'admin'`.

These helpers should be used by future admin pages and API routes. Public auth pages should not depend on admin helpers.

## Database Change

Add a migration that extends `profiles`:

```sql
alter table profiles
add column role text not null default 'user'
check (role in ('user', 'admin'));
```

The existing `handle_new_user()` trigger does not need to explicitly insert `role` because the database default creates `user`.

## Security Notes

- Public signup and login use the Supabase anon client, which is appropriate for Supabase Auth.
- Admin-only invite sending must not trust a client-side role check. The server route must verify the current session and profile role.
- `SUPABASE_SERVICE_ROLE_KEY`, if needed for admin invite operations later, must only be used server-side.
- Open redirect protections in `sanitizeAuthRedirectPath` should remain in place.

## Testing

Focused tests should cover:

- Signup validates password and confirm password before calling Supabase.
- Login no longer renders public magic-link mode.
- New database migration defaults role to `user`.
- Admin helper allows `admin` and rejects `user` or unauthenticated requests.
- Existing middleware still leaves `/analyze` public and protects account-bound pages.

## Rollout

1. Add `profiles.role` migration.
2. Convert `/signup` to password registration.
3. Convert `/login` to password-only public login.
4. Preserve `/api/auth/callback` only for hidden beta invite and future password recovery callbacks.
5. Promote founder account to admin manually in Supabase.
6. Add hidden admin beta invite tooling as a follow-up feature.

