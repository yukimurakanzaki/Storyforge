/**
 * REAL local-API Free/Pro enforcement gauntlet.
 *
 * Runs the ACTUAL POST /api/workspace handler against a REAL local Supabase stack
 * (real Postgres + RLS + service_role), with ONLY the AI stubbed — so it proves
 * real 49/50/51 behaviour, rejected-request AI suppression, and the Free smoke
 * cases end-to-end, not just unit-mocked logic.
 *
 * Skipped automatically unless the local stack env is present, so the default
 * `vitest run` is unaffected. To run it:
 *   supabase start  (local stack)  + apply prod-prestate + 012 + analysis_results
 *   LOCAL_SUPABASE_URL=... LOCAL_SERVICE_KEY=... npx vitest run tests/integration/workspace-gauntlet.local.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient as createRealClient } from '@supabase/supabase-js'
import { assertLoopbackUrl } from './loopback-guard'

const URL = process.env.LOCAL_SUPABASE_URL
const KEY = process.env.LOCAL_SERVICE_KEY
const run = URL && KEY ? describe : describe.skip

// AI stub (hoisted so the vi.mock factory can reference it) + a spy to assert
// the model is NOT called on rejected requests.
const { mockAiCreate } = vi.hoisted(() => ({ mockAiCreate: vi.fn() }))
const TURN = {
  intent: 'new_or_expanded_requirement', assistantMessage: 'ok',
  newGaps: [], resolvedGapIds: [], gapAnswers: {}, outOfScopeGapIds: [], prd: null,
}
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: mockAiCreate } },
  Anthropic: class {},
}))

// The authed user is swapped per scenario; the server-client mock reads it.
const session = vi.hoisted(() => ({ uid: '' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const { createClient } = require('@supabase/supabase-js')
    const c = createClient(process.env.LOCAL_SUPABASE_URL, process.env.LOCAL_SERVICE_KEY, { auth: { persistSession: false } })
    c.auth.getUser = async () => ({ data: { user: { id: session.uid } }, error: null })
    return c
  },
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(process.env.LOCAL_SUPABASE_URL, process.env.LOCAL_SERVICE_KEY, { auth: { persistSession: false } })
  },
}))

function post(body: unknown) {
  return new NextRequest('http://localhost/api/workspace', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function sseEvents(res: Response): Promise<string[]> {
  const text = await res.text()
  return text.trim().split('\n\n')
    .map((c) => c.split('\n').find((l) => l.startsWith('event: '))?.slice(7).trim())
    .filter(Boolean) as string[]
}

run('local API gauntlet — real DB enforcement + AI suppression', () => {
  // SAFETY: refuse to run against anything but a loopback host BEFORE constructing
  // any client or registering hooks — a cloud URL here would touch real data.
  if (URL) assertLoopbackUrl(URL)
  // Guard construction so the skipped describe doesn't build a client with no env.
  const svc = URL && KEY ? createRealClient(URL, KEY, { auth: { persistSession: false } }) : (undefined as never)
  let proUser = ''
  let freeUser = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<Response>

  async function setCount(uid: string, count: number) {
    await svc.from('usage_counters').update({
      count, reset_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    }).eq('user_id', uid)
  }

  beforeAll(async () => {
    mockAiCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(TURN) }] })
    ;({ POST } = await import('@/app/api/workspace/route') as never)
    const p = await svc.auth.admin.createUser({ email: `pro-${Date.now()}@test.local`, password: 'pw-123456', email_confirm: true })
    proUser = p.data.user!.id
    const f = await svc.auth.admin.createUser({ email: `free-${Date.now()}@test.local`, password: 'pw-123456', email_confirm: true })
    freeUser = f.data.user!.id
    await svc.from('subscriptions').update({ plan: 'pro' }).eq('user_id', proUser)
  }, 30000)

  afterAll(async () => {
    for (const uid of [proUser, freeUser].filter(Boolean)) {
      // FKs have no ON DELETE CASCADE -> remove child rows before the auth user.
      await svc.from('analysis_results').delete().eq('user_id', uid)
      await svc.from('analysis_events').delete().eq('user_id', uid)
      await svc.from('usage_counters').delete().eq('user_id', uid)
      await svc.from('subscriptions').delete().eq('user_id', uid)
      await svc.from('profiles').delete().eq('id', uid)
      try { await svc.auth.admin.deleteUser(uid) } catch { /* best-effort */ }
    }
  })

  beforeEach(() => mockAiCreate.mockClear())

  it('Free new session under limit -> 200, AI called, counter increments to 1', async () => {
    session.uid = freeUser; await setCount(freeUser, 0)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: 'BRD: fitur baru.' }))
    expect(res.status).toBe(200)
    expect(await sseEvents(res)).toContain('done')
    expect(mockAiCreate).toHaveBeenCalledTimes(1)
    const { data } = await svc.from('usage_counters').select('count').eq('user_id', freeUser).single()
    expect(data!.count).toBe(1)
  })

  it('Free at 3/3, NEW session -> 429 + X-Limit-Reached, AI NOT called', async () => {
    session.uid = freeUser; await setCount(freeUser, 3)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: 'BRD lain.' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('X-Limit-Reached')).toBe('true')
    expect(mockAiCreate).not.toHaveBeenCalled()
  })

  it('Free EXISTING session at limit -> 200 (continuation free), counter unchanged', async () => {
    session.uid = freeUser; await setCount(freeUser, 3)
    const sid = crypto.randomUUID()
    await svc.from('analysis_results').insert({
      user_id: freeUser, session_id: sid, brd_text: 'BRD lama', title: 'Lama',
      status: 'active', messages: [], gaps: [], readiness_score: 100, readiness_label: 'Siap',
    })
    const res = await POST(post({ sessionId: sid, message: 'lanjutkan' }))
    expect(res.status).toBe(200)
    expect(await sseEvents(res)).toContain('done')
    expect(mockAiCreate).toHaveBeenCalledTimes(1)
    const { data } = await svc.from('usage_counters').select('count').eq('user_id', freeUser).single()
    expect(data!.count).toBe(3) // continuation did not consume quota
  })

  it('Pro at 49 -> 200, AI called, counter -> 50', async () => {
    session.uid = proUser; await setCount(proUser, 49)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: 'BRD pro.' }))
    expect(res.status).toBe(200)
    expect(await sseEvents(res)).toContain('done')
    expect(mockAiCreate).toHaveBeenCalledTimes(1)
    const { data } = await svc.from('usage_counters').select('count').eq('user_id', proUser).single()
    expect(data!.count).toBe(50)
  })

  it('Pro at 50 (hard cap) -> 429, AI NOT called', async () => {
    session.uid = proUser; await setCount(proUser, 50)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: 'BRD pro lagi.' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('X-Limit-Reached')).toBe('true')
    expect(mockAiCreate).not.toHaveBeenCalled()
  })

  it('Pro at 51 -> 429, AI NOT called', async () => {
    session.uid = proUser; await setCount(proUser, 51)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: 'BRD pro 51.' }))
    expect(res.status).toBe(429)
    expect(mockAiCreate).not.toHaveBeenCalled()
  })

  it('Empty message -> 400, AI NOT called', async () => {
    session.uid = freeUser; await setCount(freeUser, 0)
    const res = await POST(post({ sessionId: crypto.randomUUID(), message: '   ' }))
    expect(res.status).toBe(400)
    expect(mockAiCreate).not.toHaveBeenCalled()
  })

  it('Oversized message (>150k) -> 200, truncated to 150,000 in both persistence and provider input', async () => {
    session.uid = freeUser; await setCount(freeUser, 0)
    const sid = crypto.randomUUID()
    const huge = 'a'.repeat(160_000)
    const res = await POST(post({ sessionId: sid, message: huge }))
    expect(res.status).toBe(200)
    expect(await sseEvents(res)).toContain('done')

    // Persisted input is bounded to the 150,000-char cap.
    const { data } = await svc.from('analysis_results').select('brd_text').eq('session_id', sid).single()
    expect((data!.brd_text as string).length).toBe(150_000)

    // Provider input is bounded: the verbatim message reached the model at <=150k,
    // and the full 160k original never reached it (no run of 150,001 chars anywhere).
    const callArg = mockAiCreate.mock.calls.at(-1)![0] as { system: string; messages: { content: string }[] }
    const maxMsgLen = Math.max(...callArg.messages.map((m) => m.content.length))
    expect(maxMsgLen).toBe(150_000)
    expect(JSON.stringify(callArg).includes('a'.repeat(150_001))).toBe(false)
  })
})
