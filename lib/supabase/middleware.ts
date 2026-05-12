import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

export function isProtectedAppPath(pathname: string): boolean {
  return (
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signup')

  const isProtectedPage = isProtectedAppPath(pathname)

  // Redirect logged-in users away from auth pages (not set-password)
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/analyze'
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
