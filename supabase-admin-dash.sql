-- ============================================================
--  tiyul+ · The owner dashboard
--  Run in Supabase → SQL Editor. Safe to run twice.
-- ============================================================
--
--  The dashboard itself works even without this file - it reads tables
--  that already exist (user_trips, shared_trips, profiles, ai_spend).
--  What this file adds:
--
--  1. An aggregate event counter, to answer "how many trips get exported".
--  2. Indexes that make the dashboard fast once there are many rows.
--
--  The admin access log lives in `admin_audit` from supabase-admin.sql
--  and nothing further is required here.
-- ============================================================

-- ---------- 1. Event counter ----------
--  **Aggregate on purpose, not a behavior log.** There is no user_id here,
--  no trip_id and no precise timestamp - only "on this day there were N
--  prints". That is the answer to Netanel's question without creating
--  tracking of people.
--
--  2026-08-13: the dashboard's growth events were added to the list - trip
--  created, share opened, share adoption, newsletter signup, return visit.
--  Exactly the same principle: day + kind + counter, no identity. **Anyone
--  who already ran this file needs to run it again** - create or replace
--  swaps in the function with the extended list; without it the new kinds
--  are silently swallowed (the function returns without writing) and the
--  dashboard shows zeros that look like a quiet week.
--  supabase-check.sql knows how to detect this state and say to re-run.
create table if not exists public.app_events (
  day   date not null,
  kind  text not null,          -- see the closed list in the function below
  count integer not null default 0,
  primary key (day, kind)
);

create or replace function public.bump_event(p_day date, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A closed list inside the function: even if something calls it with a
  -- different value, no new key is created. The route validates anyway;
  -- this is the second layer.
  if p_kind not in (
    'print', 'pdf', 'whatsapp', 'share', 'maps',
    'trip_created', 'shared_open', 'shared_adopt', 'newsletter', 'return_visit'
  ) then
    return;
  end if;
  insert into public.app_events (day, kind, count)
  values (p_day, p_kind, 1)
  on conflict (day, kind) do update
    set count = public.app_events.count + 1;
end;
$$;

alter table public.app_events enable row level security;
-- No policy: RLS enabled with no policy = service role only.
revoke all on public.app_events from anon, authenticated;
-- The function is called from the server with the service role only
revoke all on function public.bump_event(date, text) from anon, authenticated;

-- ---------- 2. Dashboard indexes ----------
create index if not exists user_trips_updated_idx on public.user_trips (updated_at desc);
create index if not exists shared_trips_created_idx on public.shared_trips (created_at desc);
-- Removed 2026-08-13: the line that was here attempted
-- `create index ... on public.admin_audit (at desc)`, and no such column
-- exists - admin_audit has created_at (see supabase-admin.sql line 84),
-- not at. The run failed on that line every time. The correct index
-- - `admin_audit_created_idx on public.admin_audit (created_at desc)`
-- - already exists in supabase-admin.sql; no need for another one here.
