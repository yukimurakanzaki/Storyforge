-- 012_core_saas_enforcement.sql  (P0-02 + P0 security hardening)
--
-- Reconciles two realities:
--   * PRODUCTION, where subscriptions/usage_counters/analysis_events are ABSENT
--     (migrations 001/003/004/008 were never applied), and
--   * a CLEAN REPLAY, where 001/003/004 already create the old shapes.
--
-- Steady-state design: writes are server-side (service role); end users get
-- SELECT-own only. event_type is TEXT (allow-list lives in TS). Idempotent;
-- applied atomically by apply_migration (single transaction).

-- 1. analysis_events --------------------------------------------------------
create table if not exists public.analysis_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  session_id text not null,
  event_type text not null,
  word_count integer,
  token_count integer,
  duration_ms integer,
  metadata jsonb,
  created_at timestamptz default now()
);
-- Clean-replay safety: 001 creates this table WITHOUT metadata, and the
-- CREATE-IF-NOT-EXISTS above is then a no-op, so add the column explicitly.
alter table public.analysis_events add column if not exists metadata jsonb;
create index if not exists idx_events_user_week on public.analysis_events(user_id, created_at desc);
create index if not exists idx_events_session  on public.analysis_events(user_id, session_id, event_type);
alter table public.analysis_events enable row level security;
drop policy if exists "Users can read own events"   on public.analysis_events;
drop policy if exists "Users can insert own events" on public.analysis_events;  -- forge-able; removed
create policy "Users can read own events" on public.analysis_events
  for select using (auth.uid() = user_id);

-- 2. usage_counters ---------------------------------------------------------
create table if not exists public.usage_counters (
  user_id uuid primary key references auth.users(id),
  first_analysis_at timestamptz,
  count integer default 0,
  reset_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.usage_counters enable row level security;
drop policy if exists "Users can read own counter"   on public.usage_counters;
drop policy if exists "Users can update own counter" on public.usage_counters;  -- quota self-reset; removed
drop policy if exists "Users can insert own counter" on public.usage_counters;
create policy "Users can read own counter" on public.usage_counters
  for select using (auth.uid() = user_id);

-- 3. subscriptions ----------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  plan text default 'free',
  status text default 'active',
  xendit_subscription_id text,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  consent_v15_accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- 4. profiles: lock 'role' out of every client write path -------------------
alter table public.profiles add column if not exists role text not null default 'user';
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_role_check check (role in ('user','admin'));
  end if;
end $$;
drop policy if exists "Users can insert own profile" on public.profiles;   -- remove self-insert (role-forge) path
-- Deterministic privileges: strip ALL (incl. TRUNCATE and DELETE, which RLS does
-- NOT gate) from anon/authenticated, then re-grant only read + a column-limited
-- write. service_role keeps full access for backend ops (account deletion, admin).
revoke all on public.profiles from anon, authenticated;
grant  select on public.profiles to authenticated;                         -- read own (RLS)
grant  update (full_name, updated_at) on public.profiles to authenticated; -- 'role' stays unwritable by users
grant  all on public.profiles to service_role;

-- 4b. Deterministic table privileges --------------------------------------
-- Do NOT depend on the project's default-privilege config (which is
-- environment-specific). End users may only SELECT (own rows, scoped by the RLS
-- policies above); every write goes through the service role. These are
-- idempotent and harmless where Supabase defaults already granted them.
revoke all on public.subscriptions  from authenticated, anon;
revoke all on public.usage_counters  from authenticated, anon;
revoke all on public.analysis_events from authenticated, anon;
grant select on public.subscriptions  to authenticated;
grant select on public.usage_counters  to authenticated;
grant select on public.analysis_events to authenticated;
grant all on public.subscriptions  to service_role;
grant all on public.usage_counters  to service_role;
grant all on public.analysis_events to service_role;

-- 5. Auto-provision trigger (SECURITY DEFINER + pinned search_path) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''                                   -- prevents search_path injection
as $$
begin
  insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict (id) do nothing;
  insert into public.usage_counters (user_id, count, reset_at)
    values (new.id, 0, now() + interval '30 days') on conflict (user_id) do nothing;
  insert into public.subscriptions (user_id, plan, status)
    values (new.id, 'free', 'active') on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Backfill existing users (idempotent). analysis_events is intentionally
--    NOT backfilled — WAA / funnel metrics start fresh from this migration.
insert into public.profiles (id, full_name)
  select u.id, coalesce(u.raw_user_meta_data->>'full_name','')
  from auth.users u on conflict (id) do nothing;
insert into public.usage_counters (user_id, count, reset_at)
  select u.id, 0, now() + interval '30 days'
  from auth.users u on conflict (user_id) do nothing;
insert into public.subscriptions (user_id, plan, status)
  select u.id, 'free', 'active'
  from auth.users u on conflict (user_id) do nothing;
