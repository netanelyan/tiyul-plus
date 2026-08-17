-- ============================================================
-- tiyul+ premium: the plan on the profile + a daily usage counter
-- Run in Supabase's SQL Editor (idempotent - safe to run again).
-- Prerequisite: supabase-profiles.sql has already run (the profiles table exists).
-- ============================================================

-- 1. The plan column + the Stripe customer id
alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium'));
alter table public.profiles
  add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- 2. A critical hardening: a user cannot upgrade themselves.
--    RLS already limits them to their own row; column-level grants limit *which*
--    columns they may write - plan and stripe_customer_id are written only by the
--    service role (Stripe's webhook).
revoke insert, update on table public.profiles from authenticated;
grant insert (user_id, display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;
grant update (display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;

-- 3. A daily usage counter (AI units) - service role only.
--    identity = 'user:<uuid>' or 'ip:<addr>'; there is no personal content here.
create table if not exists public.usage_daily (
  identity text not null,
  day date not null,
  units bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (identity, day)
);

alter table public.usage_daily enable row level security;
-- Deliberately no policies: anon/authenticated are blocked entirely;
-- the service role bypasses RLS and that is the only way in.
revoke all on table public.usage_daily from anon, authenticated;

-- 4. An atomic update of the counter (insert-or-increment) - service role only
create or replace function public.bump_usage(p_identity text, p_day date, p_units bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_daily (identity, day, units, updated_at)
  values (p_identity, p_day, greatest(p_units, 0), now())
  on conflict (identity, day)
  do update set units = usage_daily.units + greatest(excluded.units, 0), updated_at = now();
$$;

revoke execute on function public.bump_usage(text, date, bigint) from public, anon, authenticated;

-- 5. Automatic cleanup is not needed immediately - one row per identity per day; a
--    cleanup job for rows older than 90 days can be added later.
