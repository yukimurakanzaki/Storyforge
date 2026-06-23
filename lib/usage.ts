import { SupabaseClient } from '@supabase/supabase-js'
import { FREE_TIER_LIMIT, PRO_TIER_LIMIT } from '@/lib/constants'
import type { AnalysisEventType } from '@/lib/analytics/events'

interface UsageCheckResult {
  allowed: boolean
  count: number
  limit: number
  plan: 'free' | 'pro'
}

// PostgREST error codes surfaced through supabase-js:
//  - PGRST116: ".single()" matched zero rows (a legitimately missing row).
//  - PGRST205: the table is not in the schema cache (it does not exist yet —
//    this is what a pre-migration production database returns, NOT 42P01).
// 42P01 is the raw Postgres "undefined_table" code, kept defensively for any
// non-PostgREST path (e.g. an RPC).
const NO_ROW_CODE = 'PGRST116'
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01'])

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

/**
 * Determine whether a user may start a NEW analysis, plus their plan/quota.
 *
 * Reads are intentionally tolerant of a pre-migration schema (PGRST205/42P01 ->
 * inert "allowed", matching the app's behaviour before enforcement shipped) but
 * fail CLOSED on any other (transient) database error, so a blip cannot silently
 * disable the cap. The reset write and all counter writes are performed by the
 * caller's client — which is the SERVICE-ROLE client in the API routes, because
 * the steady-state RLS gives end users SELECT-own only on usage_counters.
 *
 * Pro is HARD-CAPPED: the same `count < limit` rule applies to both tiers.
 * Entitlement fails closed to "free" on any subscription read problem.
 */
function isBenignReadError(code: string | undefined): boolean {
  // No row yet (new user) or table not migrated yet — safe to treat as "no data".
  return code === NO_ROW_CODE || (code != null && MISSING_TABLE_CODES.has(code))
}

export async function checkUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  // --- Plan / entitlement ---
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single()

  if (subErr && !isBenignReadError(errorCode(subErr))) {
    // Transient subscription error -> fail CLOSED (do not let an analysis through
    // on an untrusted entitlement state). Same taxonomy as the counter read.
    return { allowed: false, count: 0, limit: FREE_TIER_LIMIT, plan: 'free' }
  }

  // Benign sub errors (no row / pre-migration) and a non-pro plan both -> free.
  // We never over-grant Pro on error.
  const plan: 'free' | 'pro' = !subErr && sub?.plan === 'pro' ? 'pro' : 'free'
  const limit = plan === 'pro' ? PRO_TIER_LIMIT : FREE_TIER_LIMIT

  // --- Usage counter ---
  const { data: usage, error: usageErr } = await supabase
    .from('usage_counters')
    .select('count, reset_at')
    .eq('user_id', userId)
    .single()

  if (usageErr) {
    // No counter row yet (new user) OR table not migrated yet -> allow (inert).
    if (isBenignReadError(errorCode(usageErr))) {
      return { allowed: true, count: 0, limit, plan }
    }
    // Any other (transient) error -> fail CLOSED so the cap can't be bypassed.
    return { allowed: false, count: 0, limit, plan }
  }

  if (!usage) {
    return { allowed: true, count: 0, limit, plan }
  }

  // Rolling 30-day window: reset on read once the window has elapsed.
  const resetAt = usage.reset_at ? new Date(usage.reset_at) : null
  if (resetAt && new Date() > resetAt) {
    const { error: resetErr } = await supabase
      .from('usage_counters')
      .update({
        count: 0,
        reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Supabase reports DB failures via `error`, not by throwing. If the reset did
    // not persist, fail CLOSED rather than granting a phantom (un-persisted) reset.
    if (resetErr) {
      return { allowed: false, count: usage.count, limit, plan }
    }
    return { allowed: true, count: 0, limit, plan }
  }

  // Hard cap for BOTH tiers (Pro is no longer unlimited).
  return {
    allowed: usage.count < limit,
    count: usage.count,
    limit,
    plan,
  }
}

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Check if a row already exists for this user. PGRST116 = "no row" (first-time
  // user) is expected; any other read error is real and must surface.
  const { data: current, error: selErr } = await supabase
    .from('usage_counters')
    .select('count, first_analysis_at')
    .eq('user_id', userId)
    .single()
  if (selErr && errorCode(selErr) !== NO_ROW_CODE) throw selErr

  if (!current) {
    // First-time user: INSERT a new row with count=1
    const { error } = await supabase.from('usage_counters').insert({
      user_id: userId,
      count: 1,
      first_analysis_at: now.toISOString(),
      reset_at: resetAt.toISOString(),
      updated_at: now.toISOString(),
    })
    if (error) throw error
  } else {
    // Existing user: UPDATE with incremented count
    const { error } = await supabase
      .from('usage_counters')
      .update({
        count: current.count + 1,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
    if (error) throw error
  }
}

export async function logAnalysisEvent(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  eventType: AnalysisEventType,
  wordCount?: number,
  durationMs?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Supabase resolves DB failures via `error` (it does not reject), so an
  // unchecked insert would swallow lost analytics. Propagate so callers' catch
  // handlers run.
  const { error } = await supabase.from('analysis_events').insert({
    user_id: userId,
    session_id: sessionId,
    event_type: eventType,
    word_count: wordCount,
    duration_ms: durationMs,
    metadata: metadata ?? null,
  })
  if (error) throw error
}

export async function getUsageForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; limit: number; plan: 'free' | 'pro' }> {
  const result = await checkUsage(supabase, userId)
  return { count: result.count, limit: result.limit, plan: result.plan }
}
