import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  checkAuthRateLimit,
  recordAuthFailure,
  getClientIp,
} from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)

  // Check rate limit before processing
  const rateLimit = checkAuthRateLimit(ip, 'reset')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi nanti.', retryAfter: rateLimit.retryAfterSeconds },
      {
        status: 429,
        headers: { 'retry-after': String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  const body = await request.json().catch(() => null)
  const email = body?.email

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Email diperlukan.' },
      { status: 400 }
    )
  }

  // Always record a failure for rate limiting purposes regardless of whether
  // the email exists — prevents enumeration via timing differences.
  recordAuthFailure(ip, 'reset')

  const { origin } = new URL(request.url)
  const supabase = await createClient()

  // Call resetPasswordForEmail — we intentionally ignore the result to prevent
  // enumeration. The redirect URL points to the callback route with type=recovery
  // so the callback can handle the recovery flow and redirect to update-password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?type=recovery`,
  })

  // Always return 200 regardless of whether the email exists in the system
  return NextResponse.json(
    { message: 'Cek email kamu untuk link reset password.' },
    { status: 200 }
  )
}
