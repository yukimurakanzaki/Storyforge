-- 012_rls_write_matrix.sql — RLS write-negative + service-role-positive matrix.
--
-- Verifies the steady-state security model created by 012:
--   * end users (role `authenticated`) can NOT write usage_counters,
--     analysis_events, subscriptions, or escalate profiles.role;
--   * the service role CAN perform those writes.
--
-- SELF-CONTAINED: this file wraps the probe in its own BEGIN/ROLLBACK, so the
-- positive-control mutations are rolled back automatically — no caller wrapper is
-- required. A post-rollback verification block then asserts that NO probe artifact
-- persisted. FAIL-FAST: any unmet expectation (or any leak) RAISEs EXCEPTION, so
-- "completes with no error" == every check passed AND nothing was persisted.

begin;

do $$
declare
  user_a uuid;
  user_b uuid;
  n integer;
  denied boolean;
begin
  select id into user_a from auth.users order by created_at asc limit 1;
  select id into user_b from auth.users where id <> user_a order by created_at asc limit 1;
  if user_a is null or user_b is null then
    raise exception 'NEED >=2 auth.users to run the RLS matrix (have a=%, b=%)', user_a, user_b;
  end if;

  -- ============ act as authenticated USER A ============
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
                     json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  -- 1. INSERT analysis_events (own) -> denied (no insert policy)
  denied := false;
  begin
    insert into public.analysis_events(user_id, session_id, event_type)
      values (user_a, 'rls-probe', 'analysis_started');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated INSERT analysis_events was allowed'; end if;

  -- 2. INSERT usage_counters (own) -> denied
  denied := false;
  begin
    insert into public.usage_counters(user_id, count) values (user_a, 0);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated INSERT usage_counters was allowed'; end if;

  -- 3. UPDATE usage_counters SET count=0 (own) -> DENIED, via either mechanism:
  --    no UPDATE privilege (insufficient_privilege) OR RLS filtering to 0 rows.
  denied := false;
  begin
    update public.usage_counters set count = 0 where user_id = user_a;
    get diagnostics n = row_count;
    if n = 0 then denied := true; end if;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated UPDATE usage_counters was allowed'; end if;

  -- 4. UPDATE subscriptions SET plan (own) -> DENIED (no privilege OR 0 rows)
  denied := false;
  begin
    update public.subscriptions set plan = 'pro' where user_id = user_a;
    get diagnostics n = row_count;
    if n = 0 then denied := true; end if;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated UPDATE subscriptions was allowed'; end if;

  -- 5. INSERT subscriptions (own) -> denied
  denied := false;
  begin
    insert into public.subscriptions(user_id, plan) values (user_a, 'pro');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated INSERT subscriptions was allowed'; end if;

  -- 6. INSERT profiles (own, role=admin) -> denied (insert revoked / no policy)
  denied := false;
  begin
    insert into public.profiles(id, role) values (user_a, 'admin');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated INSERT profiles was allowed'; end if;

  -- 7. UPDATE profiles SET role=admin (own) -> denied (column privilege)
  denied := false;
  begin
    update public.profiles set role = 'admin' where id = user_a;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated escalated profiles.role'; end if;

  -- 8. UPDATE profiles SET full_name (own) -> allowed column (probe marker)
  update public.profiles set full_name = 'rls-probe' where id = user_a;
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: authenticated could not update own full_name (rows=%)', n; end if;

  -- 8b. DELETE profiles (own) -> denied (no DELETE privilege; RLS would also 0-row)
  denied := false;
  begin
    delete from public.profiles where id = user_a;
    get diagnostics n = row_count;
    if n = 0 then denied := true; end if;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated DELETE profiles was allowed'; end if;

  -- 8c. TRUNCATE profiles -> denied. RLS does NOT gate TRUNCATE; only the table
  --     privilege does, so this proves the revoke-all closed that hole.
  denied := false;
  begin
    truncate public.profiles;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: authenticated TRUNCATE profiles was allowed'; end if;

  -- 9. cross-tenant SELECT isolation: A must not see B's rows
  select count(*) into n from public.subscriptions where user_id = user_b;
  if n <> 0 then raise exception 'FAIL: user A can read user B subscription (% rows)', n; end if;
  select count(*) into n from public.usage_counters where user_id = user_b;
  if n <> 0 then raise exception 'FAIL: user A can read user B usage_counters (% rows)', n; end if;

  -- ============ act as the REAL service_role (positive controls) ============
  -- Switch to the literal service_role the app uses (NOT `reset role`, which would
  -- fall back to the superuser session role and prove nothing). Clear the JWT claims
  -- so this is a backend context, and assert we are actually service_role.
  execute 'set local role service_role';
  perform set_config('request.jwt.claims', '', true);
  if current_user <> 'service_role' then
    raise exception 'FAIL: positive controls not running as service_role (current_user=%)', current_user;
  end if;

  insert into public.analysis_events(user_id, session_id, event_type, metadata)
    values (user_a, 'rls-probe', 'analysis_completed', '{"probe":true}'::jsonb);
  insert into public.usage_counters(user_id, count, reset_at)
    values (user_b, 7, now() + interval '30 days')
    on conflict (user_id) do update set count = excluded.count;
  update public.subscriptions set plan = 'pro' where user_id = user_b;
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: service_role could not update subscriptions (rows=%)', n; end if;
  update public.profiles set full_name = 'svc-probe' where id = user_b;
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: service_role could not update profiles (rows=%)', n; end if;
  update public.profiles set role = 'admin' where id = user_b;
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: service_role could not set profiles.role (rows=%)', n; end if;
  -- account-deletion path: service_role must be able to DELETE a profile row
  delete from public.profiles where id = user_a;
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: service_role could not delete a profile (rows=%)', n; end if;
  execute 'reset role';

  raise notice 'RLS write-matrix: ALL CHECKS PASSED';
end $$;

rollback;

-- ============ post-rollback state verification ============
-- Runs OUTSIDE the rolled-back transaction; reads committed state and asserts that
-- none of the probe's positive-control mutations persisted.
do $$
declare n integer;
begin
  select count(*) into n from public.analysis_events where session_id = 'rls-probe';
  if n <> 0 then raise exception 'LEAK: % analysis_events probe rows persisted after rollback', n; end if;
  select count(*) into n from public.profiles where full_name = 'rls-probe';
  if n <> 0 then raise exception 'LEAK: % profiles probe rows persisted after rollback', n; end if;
  raise notice 'RLS write-matrix: rollback verified — no probe artifacts persisted';
end $$;
