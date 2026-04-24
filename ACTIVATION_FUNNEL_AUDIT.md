# StoryForge Activation Funnel Audit (Next.js + Supabase)

Date: 2026-04-24

## Scope inspected

- `middleware.ts`
- `lib/supabase/middleware.ts`
- `app/(auth)/login/page.tsx`
- `app/api/auth/callback/route.ts`
- `app/(app)/analyze/page.tsx`
- `app/api/analyze/route.ts`
- `components/AuthNav.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/page.tsx`
- `lib/usage.ts`

## Current bottlenecks found

1. **Mandatory login before first analysis is enforced in middleware**
   - `/analyze` is treated as protected and unauthenticated users are redirected to `/login`.
2. **Analyze API requires auth unconditionally**
   - `/api/analyze` returns 401 if no user session.
3. **No guest usage quota path**
   - Usage checks and increments are user-table-only (`usage_counters`).
4. **Header auth states are minimal/inconsistent**
   - Landing page has no explicit stateful auth controls.
   - Analyze/dashboard/detail headers do not consistently expose “dashboard vs login/logout” states for all auth conditions.
5. **Magic link redirect is vulnerable to open redirect + stale callback path assumptions**
   - Callback trusts `redirect` query directly.
   - Login sets callback URL to `/api/auth/callback`; better to keep a single post-auth target and sanitize redirect.

---

## Proposed production-ready implementation plan (exact file changes)

### 1) Remove mandatory login before first BRD analysis

### File: `lib/supabase/middleware.ts`

- Keep `/dashboard`, `/analyze/[id]`, and `/settings` protected.
- Make `/analyze` (base route only) public.
- Preserve redirect behavior for protected routes with `redirect` query.

**Concrete change:** replace broad `startsWith('/analyze')` rule with route-sensitive checks:

```ts
const pathname = request.nextUrl.pathname
const isAnalyzeBase = pathname === '/analyze'
const isAnalyzeDetail = pathname.startsWith('/analyze/')

const isProtectedPage =
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/settings') ||
  isAnalyzeDetail

// no redirect for unauthenticated base analyze page
if (!user && isProtectedPage) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', pathname)
  return NextResponse.redirect(url)
}
```

### File: `middleware.ts`

- Keep matcher as-is (`api/` excluded) so app pages are handled by session middleware.
- No additional route matcher needed if the logic above is adjusted.

---

### 2) Add guest analysis mode

### File: `lib/usage.ts`

Add guest helpers:

- `export const GUEST_USAGE_STORAGE_KEY = 'sf_guest_usage_v1'`
- `export const GUEST_FREE_LIMIT = FREE_TIER_LIMIT`
- `type GuestUsage = { count: number; resetAt: string }`
- `readGuestUsage()`
- `canGuestAnalyze()`
- `incrementGuestUsage()`

**Behavior:** rolling 30-day window in localStorage.

### File: `app/(app)/analyze/page.tsx`

- Resolve auth state once on load (`user | null`).
- If user:
  - fetch server usage as today.
- If guest:
  - read localStorage guest usage and show limit badge.
- On analyze submit:
  - include a `x-guest-mode: 1` header when guest (optional, for analytics separation).
- On successful analyze:
  - increment local guest counter and refresh quota display.
- On 429:
  - show guest-specific CTA: “Masuk untuk menyimpan riwayat + sinkronisasi limit akun”.

### File: `app/api/analyze/route.ts`

- Support both authenticated and guest requests.
- If user exists:
  - keep `checkUsage/incrementUsage/logAnalysisEvent` and DB writes.
- If guest:
  - skip DB usage checks/increment and analysis history save.
  - still run AI analysis and stream output.
  - return success with `X-Mode: guest` header.

**Important guardrails:**
- keep Anthropic key server-only.
- never allow guest writes to user tables.
- preserve existing JSON parse fallback safety.

---

### 3) Add visible login/logout/dashboard header states

### File: `components/AuthNav.tsx`

Refactor to render explicit states:

- **Loading state:** skeleton/text.
- **Guest state:** `Masuk`, and `Dashboard` hidden.
- **User state:** show `Dashboard` link + `Keluar`.

Suggested API:

```ts
interface AuthNavProps {
  showDashboardLink?: boolean
  compact?: boolean
}
```

### File: `app/page.tsx`

- Add top-right nav using `AuthNav` (or server-side equivalent) so landing page always shows auth state.
- Primary CTA for guest becomes direct `/analyze` instead of `/login?redirect=/analyze`.

### File: `app/(app)/analyze/page.tsx`
### File: `app/(app)/dashboard/page.tsx`
### File: `app/(app)/analyze/[id]/page.tsx`

- Standardize header composition with the same auth nav behavior.
- Ensure dashboard/detail still inaccessible to guests (middleware + SSR guard).

---

### 4) Fix magic link redirect flow

### File: `app/(auth)/login/page.tsx`

- Build callback URL with safe redirect path:
  - allow only internal paths starting with `/`.
  - fallback to `/analyze`.
- Keep sending `emailRedirectTo` to `/api/auth/callback?redirect=<safePath>`.

### File: `app/api/auth/callback/route.ts`

- Sanitize `redirect` query server-side before redirecting:
  - reject absolute URLs and protocol-relative URLs.
  - enforce `redirectPath.startsWith('/')`.
  - optional allowlist (`/analyze`, `/dashboard`, `/settings`, `/`).

**Concrete utility function:**

```ts
function sanitizeRedirectPath(input: string | null): string {
  if (!input) return '/analyze'
  if (!input.startsWith('/')) return '/analyze'
  if (input.startsWith('//')) return '/analyze'
  return input
}
```

---

### 5) Keep free tier limits via local storage for guests and DB for users

### File: `lib/constants.ts`

Add:

- `export const GUEST_STORAGE_KEY = 'sf_guest_usage_v1'`
- `export const GUEST_WINDOW_DAYS = 30`

### File: `lib/usage.ts`

- Keep current DB path for authenticated users unchanged.
- Add guest helpers for localStorage-consumer components only.

### File: `app/(app)/analyze/page.tsx`

- Single usage UI component should branch by `mode: 'guest' | 'user'` and display:
  - Guest: `x/5 analisis (guest di perangkat ini)`
  - User: existing plan-based display.

---

### 6) Production-readiness hardening

### File: `app/api/analyze/route.ts`

- Add request validation (non-empty text, max chars).
- Add consistent error payload shape `{ error, message, mode }`.
- Add `Cache-Control: no-store`.

### File: `app/(app)/analyze/page.tsx`

- Handle malformed stream/JSON with user-safe fallback.
- Add deterministic state reset when switching auth state.

### File: `components/AuthNav.tsx`

- Add `aria-label` for buttons/links and avoid layout shift during auth resolution.

---

## Suggested change order

1. `lib/supabase/middleware.ts` (unblock funnel)
2. `app/page.tsx` + `components/AuthNav.tsx` (visible entrypoint states)
3. `app/api/analyze/route.ts` + `app/(app)/analyze/page.tsx` + `lib/usage.ts` + `lib/constants.ts` (guest mode + limits)
4. `app/(auth)/login/page.tsx` + `app/api/auth/callback/route.ts` (redirect hardening)
5. polish and regression checks

## Regression checklist after implementation

- Guest can open `/analyze` and run first analysis without login.
- Guest sees local quota decrement and 429 at limit.
- Logged-in user sees DB quota and history persistence.
- `/dashboard` and `/analyze/:id` redirect to login when unauthenticated.
- Magic link returns user to safe intended internal route.
- No open redirect via crafted `redirect=https://evil.com`.
