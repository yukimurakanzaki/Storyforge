import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUsageForUser } from '@/lib/usage'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no authenticated session, return 401 — caller should skip fetch entirely
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Login diperlukan.' },
      { status: 401 }
    )
  }

  try {
    // Read counters via the service-role client (users have SELECT-own only; the
    // rolling-window reset inside checkUsage needs to write).
    const svc = createServiceClient()
    const { count, limit, plan } = await getUsageForUser(svc, user.id)

    return NextResponse.json(
      { used: count, limit, plan },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
