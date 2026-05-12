import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const TIMEOUT_MS = 15_000

export async function POST() {
  // Get authenticated user from server client
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login kembali.' },
      { status: 401 }
    )
  }

  // Use service role client for admin signOut
  const adminClient = createServiceClient()

  // Implement 15-second timeout via Promise.race
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
  })

  try {
    const signOutPromise = adminClient.auth.admin.signOut(user.id, 'global')

    const { error: signOutError } = await Promise.race([
      signOutPromise,
      timeoutPromise,
    ]) as Awaited<typeof signOutPromise>

    if (signOutError) {
      return NextResponse.json(
        { error: 'Gagal keluar dari semua perangkat. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    // Success: sign out current session and clear cookies
    await supabase.auth.signOut()

    return NextResponse.json(
      { success: true, message: 'Berhasil keluar dari semua perangkat.' },
      { status: 200 }
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Operasi logout melebihi batas waktu. Silakan coba lagi.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Gagal keluar dari semua perangkat. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
