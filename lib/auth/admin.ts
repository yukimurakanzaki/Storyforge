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