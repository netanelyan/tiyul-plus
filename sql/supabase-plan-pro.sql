-- ============================================================
-- supabase-plan-pro.sql - let profiles.plan hold 'pro'
--
-- Safe to run more than once. Paste into the Supabase SQL Editor and press Run.
-- It reports what it found in the NOTICES / messages pane.
--
-- Why: the only profiles.plan CHECK in this repo is
--   plan in ('free', 'premium')   (supabase-premium.sql, supabase-admin.sql)
-- and nothing here ever widened it. The code writes plan = 'pro' from three
-- places - the admin grant (/api/admin/plan), the PayPal subscription flow and
-- the trip-pass upgrade - so on a database still carrying the two-value check,
-- every one of those writes fails (the admin page shows db_unavailable).
--
-- Same pattern as supabase-trip-pass.sql: find the CHECK that covers the column
-- by catalog lookup rather than by guessed name, because a constraint added with
-- `add column ... check (...)` gets a generated name.
-- ============================================================

do $$
declare
  real_name text;
  current_def text;
begin
  select con.conname, pg_get_constraintdef(con.oid)
    into real_name, current_def
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and att.attname = 'plan'
  limit 1;

  raise notice 'profiles.plan check before: % = %', coalesce(real_name, '(none)'), coalesce(current_def, '(none)');

  -- Already widened (by hand or by an earlier run): leave it exactly as it is.
  if current_def is not null and current_def like '%''pro''%' then
    raise notice 'profiles.plan already allows pro - nothing changed.';
    return;
  end if;

  if real_name is not null then
    execute format('alter table public.profiles drop constraint %I', real_name);
  end if;

  alter table public.profiles
    add constraint profiles_plan_check
    check (plan in ('free', 'premium', 'pro'));

  raise notice 'profiles.plan now allows free, premium, pro.';
end $$;

-- Read-only confirmation, shown as a result row.
select con.conname as constraint_name, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
where nsp.nspname = 'public'
  and rel.relname = 'profiles'
  and con.contype = 'c'
  and att.attname = 'plan';
