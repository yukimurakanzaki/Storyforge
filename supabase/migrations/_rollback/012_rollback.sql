-- 012_rollback.sql — NON-DESTRUCTIVE operational revert for 012.
--
-- 012 is additive + security-hardening. There is deliberately NO destructive
-- rollback: dropping subscriptions/usage_counters/analysis_events would delete
-- backfilled rows the app depends on, and broadly re-granting profiles UPDATE
-- would re-open the `role` column to self-promotion. Neither is permitted.
--
-- Primary rollback path is the runtime kill-switch, NOT SQL:
--   set USAGE_ENFORCEMENT_ENABLED=false  ->  enforcement off instantly,
--   schema/trigger/policies retained, counters/events still recorded.
--
-- True data restore (if ever needed) = Supabase PITR / daily backup.
--
-- The ONLY safe, data-preserving schema reversal is to stop auto-provisioning
-- new signups (no existing data is touched):

drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();   -- optional; holds no data

-- DO NOT run any of the following (left here as explicit warnings):
--   drop table ... subscriptions | usage_counters | analysis_events;   -- destroys data
--   grant update on public.profiles to authenticated;                  -- re-opens role escalation
