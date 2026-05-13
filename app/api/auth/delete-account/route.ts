import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const CONFIRM_PHRASE = 'HAPUS AKUN'

// Tables to delete from, in order (respects foreign key constraints)
const DELETION_TABLES = [
  { table: 'analyze_sessions', userIdColumn: 'user_id' },
  { table: 'analysis_history', userIdColumn: 'user_id' },
  { table: 'analysis_events', userIdColumn: 'user_id' },
  { table: 'projects', userIdColumn: 'user_id' },
  { table: 'company_context', userIdColumn: 'user_id' },
  { table: 'saved_clarifications', userIdColumn: 'user_id' },
  { table: 'usage_counters', userIdColumn: 'user_id' },
  { table: 'subscriptions', userIdColumn: 'user_id' },
  { table: 'profiles', userIdColumn: 'id' },
] as const

interface DeletedRows {
  table: string
  userIdColumn: string
  rows: Record<string, unknown>[]
}

const TIMEOUT_MS = 30_000

export async function POST(request: Request) {
  const startTime = Date.now()

  // 1. Require authenticated session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login ulang.' },
      { status: 401 }
    )
  }

  // 2. Parse request body
  let body: { password?: string; confirmPhrase?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body tidak valid.' },
      { status: 400 }
    )
  }

  const { password, confirmPhrase } = body

  if (!password) {
    return NextResponse.json(
      { error: 'Password wajib diisi untuk verifikasi.' },
      { status: 400 }
    )
  }

  // 3. Re-authenticate user
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })

  if (authError) {
    return NextResponse.json(
      { error: 'Password salah. Verifikasi gagal.' },
      { status: 401 }
    )
  }

  // 4. Validate confirmation phrase
  if (!confirmPhrase || confirmPhrase.trim() !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Frasa konfirmasi harus tepat "${CONFIRM_PHRASE}".` },
      { status: 400 }
    )
  }

  // 5. Use service role client for admin-level access (bypasses RLS)
  const serviceClient = createServiceClient()
  const uid = user.id

  // 6. Delete from tables in order with rollback support
  const deletedData: DeletedRows[] = []

  for (const { table, userIdColumn } of DELETION_TABLES) {
    // Check timeout before each operation
    if (Date.now() - startTime > TIMEOUT_MS) {
      // Rollback all previously deleted rows
      await rollback(serviceClient, deletedData)
      return NextResponse.json(
        { error: 'Operasi melebihi batas waktu 30 detik. Tidak ada data yang dihapus.', step: table },
        { status: 504 }
      )
    }

    try {
      // Fetch existing rows before deletion (for rollback)
      const { data: existingRows, error: selectError } = await serviceClient
        .from(table)
        .select('*')
        .eq(userIdColumn, uid)

      if (selectError) {
        // Table might not exist — skip gracefully
        // Postgres error code 42P01 = undefined_table
        if (selectError.code === '42P01' || selectError.message?.includes('does not exist')) {
          continue
        }
        throw new Error(`Failed to read from ${table}: ${selectError.message}`)
      }

      // If no rows, nothing to delete — skip
      if (!existingRows || existingRows.length === 0) {
        continue
      }

      // Delete the rows
      const { error: deleteError } = await serviceClient
        .from(table)
        .delete()
        .eq(userIdColumn, uid)

      if (deleteError) {
        throw new Error(`Failed to delete from ${table}: ${deleteError.message}`)
      }

      // Store deleted rows for potential rollback
      deletedData.push({ table, userIdColumn, rows: existingRows })
    } catch (err) {
      // Rollback all previously deleted rows
      await rollback(serviceClient, deletedData)
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Gagal menghapus data dari ${table}. Tidak ada data yang dihapus.`, step: table, detail: message },
        { status: 500 }
      )
    }
  }

  // 7. Check timeout before admin deleteUser
  if (Date.now() - startTime > TIMEOUT_MS) {
    await rollback(serviceClient, deletedData)
    return NextResponse.json(
      { error: 'Operasi melebihi batas waktu 30 detik. Tidak ada data yang dihapus.', step: 'auth.users' },
      { status: 504 }
    )
  }

  // 8. Delete user from auth.users via Admin API
  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(uid)

  if (deleteUserError) {
    // Rollback table deletions
    await rollback(serviceClient, deletedData)
    return NextResponse.json(
      { error: 'Gagal menghapus akun dari sistem autentikasi. Tidak ada data yang dihapus.', step: 'auth.users', detail: deleteUserError.message },
      { status: 500 }
    )
  }

  // 9. Success
  return NextResponse.json(
    { success: true, message: 'Akun berhasil dihapus.' },
    { status: 200 }
  )
}

/**
 * Rollback previously deleted rows by re-inserting them.
 * Processes in reverse order to respect foreign key constraints.
 */
async function rollback(
  serviceClient: ReturnType<typeof createServiceClient>,
  deletedData: DeletedRows[]
): Promise<void> {
  // Re-insert in reverse order (profiles first would violate FK, so reverse of deletion order)
  for (let i = deletedData.length - 1; i >= 0; i--) {
    const { table, rows } = deletedData[i]
    if (rows.length > 0) {
      try {
        await serviceClient.from(table).insert(rows)
      } catch {
        // Best-effort rollback — log but don't throw
        console.error(`Rollback failed for table ${table}`)
      }
    }
  }
}
