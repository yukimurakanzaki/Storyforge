import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkAuthRateLimit, recordAuthFailure, getClientIp } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)

  // Check rate limit before attempting auth
  const rateLimit = checkAuthRateLimit(ip, 'login')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    )
  }

  // Parse request body
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email dan password wajib diisi.' },
      { status: 400 }
    )
  }

  // Create Supabase server client with cookie handling
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

  // Attempt sign in
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Record failure for rate limiting
    recordAuthFailure(ip, 'login')
    return NextResponse.json(
      { error: 'Email atau password salah.' },
      { status: 401 }
    )
  }

  // Success — session cookies are set via the cookieStore setAll callback
  return NextResponse.json({ success: true }, { status: 200 })
}
