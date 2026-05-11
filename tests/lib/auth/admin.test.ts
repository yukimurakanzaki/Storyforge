import { describe, expect, it, vi } from 'vitest'
import { getAdminStatus } from '@/lib/auth/admin'

type MockProfileResult = {
  data: { role: string } | null
  error: { message: string } | null
}

function createSupabaseMock(user: { id: string } | null, profileResult: MockProfileResult) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(profileResult),
        })),
      })),
    })),
  }
}

describe('getAdminStatus', () => {
  it('rejects unauthenticated users', async () => {
    const supabase = createSupabaseMock(null, { data: null, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    })
  })

  it('allows admin users', async () => {
    const supabase = createSupabaseMock({ id: 'user-1' }, { data: { role: 'admin' }, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: true,
      user: { id: 'user-1' },
    })
  })

  it('rejects normal users', async () => {
    const supabase = createSupabaseMock({ id: 'user-1' }, { data: { role: 'user' }, error: null })

    await expect(getAdminStatus(supabase)).resolves.toEqual({
      ok: false,
      reason: 'forbidden',
    })
  })
})