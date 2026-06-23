import { describe, it, expect } from 'vitest'
import { incrementUsage, logAnalysisEvent } from '@/lib/usage'
import type { SupabaseClient } from '@supabase/supabase-js'

// Supabase reports DB failures via the resolved `{ error }`, not by throwing.
// These tests pin that incrementUsage / logAnalysisEvent surface those errors so
// the API routes' catch handlers actually run (instead of silently losing a quota
// increment after paid AI work, or dropping an analytics event).

function counterClient(opts: {
  current?: { count: number } | null
  selErr?: { code?: string } | null
  insertErr?: { message: string } | null
  updateErr?: { message: string } | null
}): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: opts.current ?? null, error: opts.selErr ?? null }) }),
      }),
      insert: async () => ({ error: opts.insertErr ?? null }),
      update: () => ({ eq: async () => ({ error: opts.updateErr ?? null }) }),
    }),
  } as unknown as SupabaseClient
}

function eventClient(insertErr: { message: string } | null): SupabaseClient {
  return {
    from: () => ({ insert: async () => ({ error: insertErr }) }),
  } as unknown as SupabaseClient
}

describe('incrementUsage error propagation', () => {
  it('throws when the UPDATE (existing row) returns an error', async () => {
    await expect(
      incrementUsage(counterClient({ current: { count: 2 }, updateErr: { message: 'boom' } }), 'u1'),
    ).rejects.toBeTruthy()
  })

  it('throws when the INSERT (first-time user) returns an error', async () => {
    await expect(
      incrementUsage(counterClient({ current: null, insertErr: { message: 'boom' } }), 'u1'),
    ).rejects.toBeTruthy()
  })

  it('throws when the counter read errors with a non-PGRST116 (transient) code', async () => {
    await expect(
      incrementUsage(counterClient({ current: null, selErr: { code: '57014' } }), 'u1'),
    ).rejects.toBeTruthy()
  })

  it('resolves on a clean update', async () => {
    await expect(
      incrementUsage(counterClient({ current: { count: 2 } }), 'u1'),
    ).resolves.toBeUndefined()
  })

  it('treats PGRST116 (no row) as a first-time insert, not an error', async () => {
    await expect(
      incrementUsage(counterClient({ current: null, selErr: { code: 'PGRST116' } }), 'u1'),
    ).resolves.toBeUndefined()
  })
})

describe('logAnalysisEvent error propagation', () => {
  it('throws when the event insert returns an error', async () => {
    await expect(
      logAnalysisEvent(eventClient({ message: 'boom' }), 'u1', 's1', 'analysis_started'),
    ).rejects.toBeTruthy()
  })

  it('resolves when the insert succeeds', async () => {
    await expect(
      logAnalysisEvent(eventClient(null), 'u1', 's1', 'analysis_completed', 10, 250, { provider: 'test' }),
    ).resolves.toBeUndefined()
  })
})
