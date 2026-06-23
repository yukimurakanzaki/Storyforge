// Runtime feature flags (server-side).
//
// USAGE_ENFORCEMENT_ENABLED is the P0 rollout/rollback kill-switch. When it is
// OFF the app still MEASURES (counters increment, analysis_events are logged via
// the service role) but never BLOCKS at the cap — so new code can be deployed
// ahead of the migration (measure-only burn-in) and enforcement can be disabled
// instantly without any schema/trigger/policy change.
//
// Default is ON (enabled): enforcement only relaxes when the var is explicitly
// set to the string "false". This is the safe steady state — losing the env var
// fails toward enforcing, not toward an unmetered bypass.
export function isUsageEnforcementEnabled(): boolean {
  return process.env.USAGE_ENFORCEMENT_ENABLED !== 'false'
}
