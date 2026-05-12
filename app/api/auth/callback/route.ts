import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'

/**
 * Extract display name from OAuth user metadata.
 * Priority: full_name → name → email prefix (before @)
 * Always returns a non-empty string.
 */
export function extractDisplayName(userMetadata: Record<string, unknown> | undefined, email: string | undefined): string {
  const fullName = userMetadata?.full_name
  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName.trim()
  }

  const name = userMetadata?.name
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim()
  }

  // Fallback to email prefix
  if (email && email.includes('@')) {
    return email.split('@')[0]
  }

  // Ultimate fallback (should not happen with valid auth users)
  return 'User'
}

/**
 * Check if user authenticated via an OAuth provider.
 * Returns true if providers array contains any provider other than "email".
 */
function isOAuthUser(providers: string[] | undefined): boolean {
  if (!Array.isArray(providers)) return false
  return providers.some(p => p !== 'email')
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  const redirectPath = sanitizeAuthRedirectPath(searchParams.get('redirect'))

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Handle password recovery flow — redirect to update-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/update-password', origin))
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const providers = user.app_metadata?.providers as string[] | undefined
        const userIsOAuth = isOAuthUser(providers)

        if (userIsOAuth) {
          // For OAuth users: extract and store display name, skip set-password
          const displayName = extractDisplayName(user.user_metadata, user.email)
          await supabase
            .from('profiles')
            .update({ full_name: displayName })
            .eq('id', user.id)

          return NextResponse.redirect(new URL(redirectPath, origin))
        }

        // For email users: check if new user and nudge to set password
        const createdAt = new Date(user.created_at).getTime()
        const now = Date.now()
        const isNewUser = now - createdAt < 5 * 60 * 1000 // within last 5 minutes

        if (isNewUser) {
          // First login: redirect to set-password with original destination preserved
          const setPasswordUrl = new URL('/set-password', origin)
          setPasswordUrl.searchParams.set('next', redirectPath)
          return NextResponse.redirect(setPasswordUrl)
        }
      }

      return NextResponse.redirect(new URL(redirectPath, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
