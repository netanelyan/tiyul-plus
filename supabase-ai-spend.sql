-- ============================================================
--  tiyul+ · daily spending ceiling and cost recording
--  Run in Supabase → SQL Editor. Safe to run twice.
-- ============================================================
--
--  Without this file the system still works: the ceiling is enforced from
--  each instance's memory, and the numbers in the admin area simply are not
--  persisted between restarts. With the file - the ceiling is shared across
--  all instances and the history is kept.
--
--  Privacy: both tables are accessible to the service role only. They hold
--  no user text - only identifiers, token counts and cost.
-- ============================================================

-- ---------- 1. One row per model call ----------
create table if not exists public.ai_spend (
  id           bigserial primary key,
  day          date        not null,
  at           timestamptz not null default now(),
  -- 'user:<uuid>' or 'ip:<addr>' - the same identity the quota mechanism uses
  identity     text        not null,
  user_id      uuid,
  trip_id      text,
  route        text        not null,          -- 'chat' | 'generate-trip'
  model        text        not null,
  in_tokens    integer     not null default 0,
  cached_tokens integer    not null default 0,
  write_tokens integer     not null default 0,
  out_tokens   integer     not null default 0,
  usd          numeric(12, 6) not null default 0
);

create index if not exists ai_spend_day_idx     on public.ai_spend (day desc);
create index if not exists ai_spend_user_idx    on public.ai_spend (user_id, day desc);
create index if not exists ai_spend_trip_idx    on public.ai_spend (trip_id, day desc);

-- ---------- 2. Daily rollup - one row per day ----------
--  Exists separately and not as a view: the ceiling check runs before
--  **every** request, and summing millions of rows each time is exactly
--  the kind of expense it is meant to prevent.
create table if not exists public.ai_spend_daily (
  day        date primary key,
  usd        numeric(12, 6) not null default 0,
  -- Out of the total: how much came from anonymous traffic. This is what
  -- separates the two wallets, and what prevents an anonymous visitor from
  -- switching the agent off for signed-up users.
  anon_usd   numeric(12, 6) not null default 0,
  requests   integer        not null default 0,
  -- When the approaching-the-ceiling alert was sent. Once per day, across all instances.
  alerted_at timestamptz
);
alter table public.ai_spend_daily add column if not exists anon_usd numeric(12, 6) not null default 0;

-- ---------- 2b. Daily rollup per identity ----------
--  The per-caller cap must be shared across instances, otherwise an abuser
--  bouncing between servers gets a fresh cap every time.
create table if not exists public.ai_spend_caller (
  day      date not null,
  identity text not null,
  usd      numeric(12, 6) not null default 0,
  requests integer        not null default 0,
  primary key (day, identity)
);
create index if not exists ai_spend_caller_day_idx on public.ai_spend_caller (day desc, usd desc);

-- ---------- 3. Atomic update ----------
--  Same pattern as bump_usage: insert on conflict update, so that two
--  instances writing at the same moment do not clobber each other.
create or replace function public.bump_ai_spend(
  p_day      date,
  p_usd      numeric,
  p_anon     boolean default false,
  p_identity text    default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
begin
  insert into public.ai_spend_daily (day, usd, anon_usd, requests)
  values (p_day, p_usd, case when p_anon then p_usd else 0 end, 1)
  on conflict (day) do update
    set usd      = public.ai_spend_daily.usd + excluded.usd,
        anon_usd = public.ai_spend_daily.anon_usd + excluded.anon_usd,
        requests = public.ai_spend_daily.requests + 1
  returning usd into total;

  if p_identity is not null then
    insert into public.ai_spend_caller (day, identity, usd, requests)
    values (p_day, p_identity, p_usd, 1)
    on conflict (day, identity) do update
      set usd      = public.ai_spend_caller.usd + excluded.usd,
          requests = public.ai_spend_caller.requests + 1;
  end if;

  return total;
end;
$$;

-- The old two-parameter version, if it exists, is dropped so that two
-- signatures do not remain and leave PostgREST unable to tell which one
-- to call.
drop function if exists public.bump_ai_spend(date, numeric);

--  Marks the alert as sent. Returns true only for the **first caller** - so
--  even with several instances the alert is sent once, not ten times.
create or replace function public.claim_ai_spend_alert(p_day date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.ai_spend_daily
     set alerted_at = now()
   where day = p_day and alerted_at is null
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

-- ---------- 4. Permissions ----------
alter table public.ai_spend        enable row level security;
alter table public.ai_spend_daily  enable row level security;
alter table public.ai_spend_caller enable row level security;
-- No policy on purpose: RLS enabled with no policy = service role only.
revoke all on public.ai_spend        from anon, authenticated;
revoke all on public.ai_spend_daily  from anon, authenticated;
revoke all on public.ai_spend_caller from anon, authenticated;
revoke all on function public.bump_ai_spend(date, numeric, boolean, text) from anon, authenticated;
revoke all on function public.claim_ai_spend_alert(date)     from anon, authenticated;

-- ---------- 5. Default ceiling ----------
--  Written only when no value exists, so a second run does not overwrite a
--  change you made in the admin area. To change it: /admin → the
--  spend-ceiling field, or this line with a different value.
insert into public.app_flags (key, value)
values ('ai_daily_budget_usd', '5'::jsonb)
on conflict (key) do nothing;
