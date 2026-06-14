import { WorkspaceShell } from '@/components/analyze/workspace/WorkspaceShell'
import { createClient } from '@/lib/supabase/server'

export default async function AnalyzePage() {
  // Resolve the user's plan server-side so the free-tier watermark renders
  // without an extra client round-trip. Defaults to 'free' (fails closed).
  let plan: 'free' | 'pro' = 'free'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    if (sub?.plan === 'pro') plan = 'pro'
  }
  return <WorkspaceShell plan={plan} />
}
