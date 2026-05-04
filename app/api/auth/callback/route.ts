import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
      // Check if this is a new user (first magic link login) — nudge them to set a password
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
