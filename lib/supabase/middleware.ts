import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

export function isProtectedAppPath(pathname: string): boolean {
  return (
    pathname === '/analyze' ||
    pathname.startsWith('/analyze/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/set-password')
  )
}

/**
 * Checks if a user is an unverified email-only user.
 * Returns true if email_confirmed_at is null AND providers is exactly ["email"].
 * OAuth users (providers contains a non-"email" provider) bypass this check.
 */
export function isUnverifiedEmailUser(user: User): boolean {
  const emailConfirmedAt = user.email_confirmed_at
  const providers: string[] = user.app_metadata?.providers ?? []

  // If email is confirmed, user is verified
  if (emailConfirmedAt != null) {
    return false
  }

  // If providers contains any non-"email" provider, this is an OAuth user — bypass
  const hasOAuthProvider = providers.some(
    (provider) => provider !== 'email'
  )
  if (hasOAuthProvider) {
    return false
  }

  // email_confirmed_at is null AND providers is only ["email"] (or empty)
  return true
}

/**
 * Whether the E2E auth backdoor may be used for this request. The synthetic
 * test user is ONLY honoured OUTSIDE production — Playwright runs against
 * `next dev` (NODE_ENV='development') and sends `x-e2e-test: true`. In
 * production the header is ignored entirely, closing the backdoor.
 */
export function shouldUseE2ETestUser(
  headerValue: string | null,
  hasE2ECookie: boolean,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv !== 'production' && headerValue === 'true' && hasE2ECookie
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: User | null = null
  const hasE2ECookie = Array.from(request.cookies.getAll()).some(
    (cookie) => cookie.name.includes('auth-token')
  )
  if (shouldUseE2ETestUser(request.headers.get('x-e2e-test'), hasE2ECookie)) {
    user = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { providers: ['email'] },
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User
  } else {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    user = supabaseUser
  }

  const pathname = request.nextUrl.pathname
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/update-password')

  const isProtectedPage = isProtectedAppPath(pathname)

  // Redirect logged-in users away from auth pages (not set-password)
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/analyze'
    // Clear all query parameters to avoid carrying over error parameters (e.g. ?error=auth)
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Redirect unauthenticated users to login
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Don't preserve redirect param for set-password (they'll need to re-auth)
    if (pathname !== '/set-password') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // Email verification guard: block unverified email-only users from protected routes
  // /verify-email itself is excluded so the user can access the verification pending page
  if (user && isProtectedPage && !pathname.startsWith('/verify-email')) {
    if (isUnverifiedEmailUser(user)) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
