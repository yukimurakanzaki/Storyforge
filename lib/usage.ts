import { SupabaseClient } from '@supabase/supabase-js'
import { FREE_TIER_LIMIT, PRO_TIER_LIMIT } from '@/lib/constants'

interface UsageCheckResult {
  allowed: boolean
  count: number
  limit: number
  plan: 'free' | 'pro'
}

export async function checkUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  // Get subscription plan
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single()

  const plan = (sub?.plan as 'free' | 'pro') || 'free'
  const limit = plan === 'pro' ? PRO_TIER_LIMIT : FREE_TIER_LIMIT

  // Get usage counter
  const { data: usage } = await supabase
    .from('usage_counters')
    .select('count, reset_at')
    .eq('user_id', userId)
    .single()

  if (!usage) {
    return { allowed: true, count: 0, limit, plan }
  }

  // Check if counter needs reset (rolling 30-day window)
  const resetAt = usage.reset_at ? new Date(usage.reset_at) : null
  if (resetAt && new Date() > resetAt) {
    await supabase
      .from('usage_counters')
      .update({ count: 0, reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    return { allowed: true, count: 0, limit, plan }
  }

  return {
    allowed: plan === 'pro' || usage.count < limit,
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

  // Check if a row already exists for this user
  const { data: current } = await supabase
    .from('usage_counters')
    .select('count, first_analysis_at')
    .eq('user_id', userId)
    .single()

  if (!current) {
    // First-time user: INSERT a new row with count=1
    await supabase.from('usage_counters').insert({
      user_id: userId,
      count: 1,
      first_analysis_at: now.toISOString(),
      reset_at: resetAt.toISOString(),
      updated_at: now.toISOString(),
    })
  } else {
    // Existing user: UPDATE with incremented count
    await supabase
      .from('usage_counters')
      .update({
        count: current.count + 1,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
  }
}

export async function logAnalysisEvent(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  eventType: 'analysis_started' | 'analysis_completed',
  wordCount?: number,
  durationMs?: number
): Promise<void> {
  await supabase.from('analysis_events').insert({
    user_id: userId,
    session_id: sessionId,
    event_type: eventType,
    word_count: wordCount,
    duration_ms: durationMs,
  })
}

export async function getUsageForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; limit: number; plan: 'free' | 'pro' }> {
  const result = await checkUsage(supabase, userId)
  return { count: result.count, limit: result.limit, plan: result.plan }
}
