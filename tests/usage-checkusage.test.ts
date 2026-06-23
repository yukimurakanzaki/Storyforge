import { describe, it, expect, vi } from 'vitest'
import { checkUsage } from '@/lib/usage'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown> | null
type Result = { data: Row; error: { code?: string } | null }

function client(opts: {
  sub?: Result
  usage?: Result
  onUpdate?: () => void
  resetError?: { code?: string } | null
}): SupabaseClient {
  const sub: Result = opts.sub ?? { data: { plan: 'free' }, error: null }
  const usage: Result = opts.usage ?? { data: { count: 0, reset_at: null }, error: null }
  return {
    from(table: string) {
      if (table === 'subscriptions') {
        return {
          select: () => ({ eq: () => ({ single: async () => sub }) }),
        }
      }
      // usage_counters
      return {
        select: () => ({ eq: () => ({ single: async () => usage }) }),
        update: () => ({
          eq: async () => {
            opts.onUpdate?.()
            return { error: opts.resetError ?? null }
          },
        }),
      }
    },
  } as unknown as SupabaseClient
}

const USER = 'u1'

describe('checkUsage', () => {
  it('allows a free user below the limit', async () => {
    const r = await checkUsage(client({ usage: { data: { count: 2, reset_at: null }, error: null } }), USER)
    expect(r).toMatchObject({ allowed: true, count: 2, limit: 3, plan: 'free' })
  })

  it('blocks a free user at the limit', async () => {
    const r = await checkUsage(client({ usage: { data: { count: 3, reset_at: null }, error: null } }), USER)
    expect(r.allowed).toBe(false)
  })

  it('HARD-CAPS Pro at 50 (49 allowed, 50 and 51 blocked)', async () => {
    const pro = { data: { plan: 'pro' }, error: null }
    expect((await checkUsage(client({ sub: pro, usage: { data: { count: 49, reset_at: null }, error: null } }), USER)).allowed).toBe(true)
    expect((await checkUsage(client({ sub: pro, usage: { data: { count: 50, reset_at: null }, error: null } }), USER)).allowed).toBe(false)
    expect((await checkUsage(client({ sub: pro, usage: { data: { count: 51, reset_at: null }, error: null } }), USER)).allowed).toBe(false)
  })

  it('treats a missing usage_counters row (PGRST116) as a new user -> allowed', async () => {
    const r = await checkUsage(client({ usage: { data: null, error: { code: 'PGRST116' } } }), USER)
    expect(r).toMatchObject({ allowed: true, count: 0 })
  })

  it('treats a missing table (PGRST205) as pre-migration -> inert allow', async () => {
    const r = await checkUsage(client({ usage: { data: null, error: { code: 'PGRST205' } } }), USER)
    expect(r.allowed).toBe(true)
  })

  it('treats raw undefined_table (42P01) defensively -> inert allow', async () => {
    const r = await checkUsage(client({ usage: { data: null, error: { code: '42P01' } } }), USER)
    expect(r.allowed).toBe(true)
  })

  it('FAILS CLOSED on any other (transient) counter error', async () => {
    const r = await checkUsage(client({ usage: { data: null, error: { code: '57014' } } }), USER)
    expect(r.allowed).toBe(false)
  })

  it('treats a benign subscription read (PGRST205 / no row) as free and continues', async () => {
    const r = await checkUsage(client({
      sub: { data: null, error: { code: 'PGRST205' } },
      usage: { data: { count: 2, reset_at: null }, error: null },
    }), USER)
    expect(r.plan).toBe('free')
    expect(r.limit).toBe(3)
    expect(r.allowed).toBe(true) // count 2 < 3
  })

  it('FAILS CLOSED on a transient subscription error even when under the counter limit', async () => {
    const r = await checkUsage(client({
      sub: { data: null, error: { code: '57014' } }, // statement_timeout, not benign
      usage: { data: { count: 0, reset_at: null }, error: null },
    }), USER)
    expect(r.allowed).toBe(false)
  })

  it('FAILS CLOSED when the rolling-window reset write returns an error', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const r = await checkUsage(client({
      usage: { data: { count: 9, reset_at: past }, error: null },
      resetError: { code: '57014' },
    }), USER)
    expect(r.allowed).toBe(false)
  })

  it('resets the counter when the rolling window has elapsed', async () => {
    const onUpdate = vi.fn()
    const past = new Date(Date.now() - 1000).toISOString()
    const r = await checkUsage(client({ usage: { data: { count: 9, reset_at: past }, error: null }, onUpdate }), USER)
    expect(r).toMatchObject({ allowed: true, count: 0 })
    expect(onUpdate).toHaveBeenCalled()
  })
})
