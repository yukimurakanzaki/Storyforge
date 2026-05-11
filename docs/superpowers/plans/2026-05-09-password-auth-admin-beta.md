# Password Auth and Admin Beta Magic Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert public StoryForge auth to standard email/password registration and login while preserving guest analysis and preparing hidden admin-only beta magic-link access.

**Architecture:** Public auth remains Supabase Auth through the browser anon client. Internal authorization is added as `profiles.role`, separate from `subscriptions.plan`, and a server-side admin helper verifies role before any future admin-only invite tooling. Guest access stays governed by existing middleware behavior that leaves `/analyze` public.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, Supabase Auth/SSR, PostgreSQL migrations, Vitest, TypeScript.

---

## File Structure

- Modify `app/(auth)/signup/page.tsx`: replace magic-link signup with email/password registration, confirm password validation, and success handling for both confirmed and unconfirmed Supabase projects.
- Modify `app/(auth)/login/page.tsx`: remove the magic-link segmented control and keep password login only.
- Keep `app/api/auth/callback/route.ts`: no public UI links to it, but it remains available for hidden beta magic-link callbacks and future recovery flows.
- Create `lib/auth/password.ts`: shared password validation for signup and the existing set-password page.
- Modify `app/(auth)/set-password/page.tsx`: reuse shared password validation.
- Create `lib/auth/admin.ts`: server-side helpers for loading the current user profile and verifying `role = 'admin'`.
- Create `supabase/migrations/008_profile_roles.sql`: add `profiles.role text not null default 'user'` with a role check.
- Create `tests/lib/auth/password.test.ts`: verify password rules.
- Create `tests/lib/auth/admin.test.ts`: verify role-check helper behavior with lightweight mocks.
- Do not add browser-rendered auth page unit tests in this pass because the repo does not include React Testing Library; verify page changes with TypeScript and production build.
- Create final session log in `obsidian-vault/03-Sessions/2026-05-09-password-auth-admin-beta.md`.
- Update vault index. The intended index is `obsidian-vault/00-Index.md`, but this repo currently has `obsidian-vault/00-Index.md.md`; update the existing file unless the user asks to rename it.

---

### Task 1: Shared Password Validation

**Files:**
- Create: `lib/auth/password.ts`
- Create: `tests/lib/auth/password.test.ts`
- Modify: `app/(auth)/set-password/page.tsx`

- [ ] **Step 1: Write the failing password validation tests**

Create `tests/lib/auth/password.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validatePassword } from '@/lib/auth/password'

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Aa1!aaa')).toBe('Password minimal 8 karakter')
  })

  it('rejects passwords without an uppercase letter', () => {
    expect(validatePassword('password1!')).toBe('Password harus mengandung minimal 1 huruf kapital')
  })

  it('rejects passwords without a number', () => {
    expect(validatePassword('Password!')).toBe('Password harus mengandung minimal 1 angka')
  })

  it('rejects passwords without a symbol', () => {
    expect(validatePassword('Password1')).toBe('Password harus mengandung minimal 1 simbol')
  })

  it('accepts a password that meets all rules', () => {
    expect(validatePassword('Password1!')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/lib/auth/password.test.ts`

Expected: FAIL because `@/lib/auth/password` does not exist.

- [ ] **Step 3: Create the shared password validator**

Create `lib/auth/password.ts`:

```ts
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter'
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung minimal 1 huruf kapital'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung minimal 1 angka'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung minimal 1 simbol'
  return null
}
```

- [ ] **Step 4: Reuse the validator in set-password**

In `app/(auth)/set-password/page.tsx`, remove the local `validatePassword` function and add:

```ts
import { validatePassword } from '@/lib/auth/password'
```

Keep the existing submit behavior the same.

- [ ] **Step 5: Run password tests**

Run: `npm.cmd test -- tests/lib/auth/password.test.ts`

Expected: PASS.

---

### Task 2: Database Role Migration

**Files:**
- Create: `supabase/migrations/008_profile_roles.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/008_profile_roles.sql`:

```sql
alter table profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));
```

- [ ] **Step 2: Verify migration content**

Run: `Get-Content -Raw 'supabase\migrations\008_profile_roles.sql'`

Expected output includes:

```sql
default 'user'
check (role in ('user', 'admin'))
```

---

### Task 3: Admin Authorization Helper

**Files:**
- Create: `lib/auth/admin.ts`
- Create: `tests/lib/auth/admin.test.ts`

- [ ] **Step 1: Write the failing admin helper tests**

Create `tests/lib/auth/admin.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { getAdminStatus } from '@/lib/auth/admin'

type MockProfileResult = {
  data: { role: string } | null
  error: { message: string } | null
}

function createSupabaseMock(user: { id: string } | null, profileResult: MockProfileResult) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(profileResult),
        })),
      })),
    })),
  }
}

describe('getAdminStatus', () => {
  it('rejects unauthenticated users', async () => {
    const supabase = createSupabaseMock(null, { data: null, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    })
  })

  it('allows admin users', async () => {
    const supabase = createSupabaseMock({ id: 'user-1' }, { data: { role: 'admin' }, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: true,
      user: { id: 'user-1' },
    })
  })

  it('rejects normal users', async () => {
    const supabase = createSupabaseMock({ id: 'user-1' }, { data: { role: 'user' }, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: false,
      reason: 'forbidden',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/lib/auth/admin.test.ts`

Expected: FAIL because `@/lib/auth/admin` does not exist.

- [ ] **Step 3: Create the admin helper**

Create `lib/auth/admin.ts`:

```ts
import type { User } from '@supabase/supabase-js'

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{ data: { user: User | { id: string } | null } }>
  }
  from: (table: 'profiles') => {
    select: (columns: 'role') => {
      eq: (column: 'id', value: string) => {
        single: () => Promise<{
          data: { role: string } | null
          error: { message: string } | null
        }>
      }
    }
  }
}

export type AdminStatus =
  | { ok: true; user: User | { id: string } }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' }

export async function getAdminStatus(supabase: SupabaseLike): Promise<AdminStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, reason: 'unauthenticated' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || data?.role !== 'admin') {
    return { ok: false, reason: 'forbidden' }
  }

  return { ok: true, user }
}
```

- [ ] **Step 4: Run admin tests**

Run: `npm.cmd test -- tests/lib/auth/admin.test.ts`

Expected: PASS.

---

### Task 4: Password Signup Page

**Files:**
- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Replace OTP signup with password signup**

Update `app/(auth)/signup/page.tsx` to:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'
import { validatePassword } from '@/lib/auth/password'

type SignupStatus = 'idle' | 'loading' | 'sent' | 'error'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const validationError = validatePassword(password)
    if (validationError) {
      setStatus('error')
      setErrorMsg(validationError)
      return
    }

    if (password !== confirm) {
      setStatus('error')
      setErrorMsg('Password tidak cocok')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const redirectPath = sanitizeAuthRedirectPath(params.get('redirect'))

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    if (data.session) {
      router.push(redirectPath)
      router.refresh()
      return
    }

    setStatus('sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Buat Akun Baru</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar dengan email dan password
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-800">Cek email kamu</p>
            <p className="mt-2 text-sm text-green-600">
              Buka link verifikasi untuk mengaktifkan akun StoryForge.
            </p>
            <p className="mt-1 text-xs text-green-500">{email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 karakter"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Min. 8 karakter, 1 huruf kapital, 1 angka, 1 simbol
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg || 'Terjadi kesalahan. Coba lagi.'}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email || !password || !confirm}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Mendaftarkan...' : 'Daftar'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx.cmd tsc --noEmit`

Expected: PASS. If TypeScript fails because of the URL construction, adjust the implementation to create a `URL` object from `window.location.origin` and set `redirect` with `searchParams`.

---

### Task 5: Password-Only Login Page

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Remove public magic-link UI and handler**

Update `app/(auth)/login/page.tsx` so the file contains:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus('error')
      setErrorMsg('Email atau password salah.')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const redirectPath = sanitizeAuthRedirectPath(params.get('redirect'))
    router.push(redirectPath)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Masuk ke StoryForge</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gunakan email dan password akun kamu
          </p>
        </div>

        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password kamu"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {status === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !email || !password}
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Belum punya akun?{' '}
          <Link href="/signup" className="font-medium text-teal-600 hover:text-teal-700">
            Daftar
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Confirm public magic-link text is gone**

Run: `rg -n "Magic Link|magic link|signInWithOtp|handleMagicLink" "app\(auth)\login\page.tsx" "app\(auth)\signup\page.tsx"`

Expected: no matches in public login/signup pages.

---

### Task 6: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run targeted tests**

Run: `npm.cmd test -- tests/lib/auth/password.test.ts tests/lib/auth/admin.test.ts tests/lib/auth/redirect.test.ts tests/lib/supabase/middleware.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm.cmd test`

Expected: PASS.

- [ ] **Step 3: Run TypeScript**

Run: `npx.cmd tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm.cmd run build`

Expected: PASS.

---

### Task 7: Vault Session Log and Index Update

**Files:**
- Create: `obsidian-vault/03-Sessions/2026-05-09-password-auth-admin-beta.md`
- Modify: `obsidian-vault/00-Index.md.md`

- [ ] **Step 1: Write the session log**

Create `obsidian-vault/03-Sessions/2026-05-09-password-auth-admin-beta.md`:

```md
# 2026-05-09: Password Auth and Admin Beta Magic Link

**Date:** 2026-05-09
**Status:** Planned

## Goal

Convert StoryForge public account access to standard email/password registration and login while keeping `/analyze` available for guests. Magic link remains reserved for hidden admin-controlled beta tester access.

## Decisions

- Public signup should use email, password, and confirm password.
- Public login should use email and password only.
- New registered users default to Free through the existing subscription trigger.
- Admin permission should use `profiles.role`, separate from `subscriptions.plan`.
- Founder account is promoted manually in Supabase by setting `profiles.role = 'admin'`.

## Files Planned

- `app/(auth)/signup/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/set-password/page.tsx`
- `lib/auth/password.ts`
- `lib/auth/admin.ts`
- `supabase/migrations/008_profile_roles.sql`
- `tests/lib/auth/password.test.ts`
- `tests/lib/auth/admin.test.ts`

## Next Steps

1. Execute the implementation plan in `docs/superpowers/plans/2026-05-09-password-auth-admin-beta.md`.
2. Run tests, TypeScript, and production build.
3. Promote founder account to admin in Supabase after migration is applied.
```

- [ ] **Step 2: Update the vault index**

Modify `obsidian-vault/00-Index.md.md` to include the new session under the sessions list and current status. Add these exact lines near the existing latest session references:

```md
- [[03-Sessions/2026-05-09-password-auth-admin-beta|2026-05-09: Password Auth and Admin Beta Magic Link]] - planned password auth conversion
```

And add or update a status line:

```md
- **Password auth conversion planned** - Public signup/login moves to email + password; magic link reserved for hidden admin beta access
```

---

## Founder Admin SQL

After the migration is applied and the founder account exists, run this manually in Supabase SQL editor:

```sql
update profiles
set role = 'admin'
where id = '<founder-auth-user-uuid>';
```

Find the founder auth user UUID in Supabase Auth Users.
