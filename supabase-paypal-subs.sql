-- ============================================================
--  tiyul+ - premium subscription via PayPal Subscriptions
--  Run in Supabase -> SQL Editor. Safe to run twice.
-- ============================================================
--
--  What this file does:
--  1. Widens the CHECK constraint on profiles.plan_source to include 'paypal' - the
--     value the webhook writes when a PayPal subscription is activated. Without it,
--     activation fails silently on the old constraint ('stripe','grant','promo').
--  2. Adds a paypal_subscription_id column - for support only (to locate the
--     subscription in PayPal's dashboard against a user). The flow itself does not
--     depend on it: custom_id on the webhook events carries the user's identity.
--
--  The old constraint was created without an explicit name (add column ... check inline),
--  so its real name is located via pg_constraint - exactly the same pattern as
--  supabase-premium-budget.sql, for the same reason.

do $$
declare
  real_name text;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'profiles does not exist yet - run supabase-profiles.sql first, then re-run this file';
    return;
  end if;

  select con.conname into real_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'profiles'
    and con.contype = 'c'
    and att.attname = 'plan_source'
  limit 1;

  if real_name is not null then
    execute format('alter table public.profiles drop constraint %I', real_name);
  end if;

  alter table public.profiles
    add constraint profiles_plan_source_check
    check (plan_source is null or plan_source in ('stripe', 'grant', 'promo', 'paypal'));
end $$;

-- The support column. A new column does not enter authenticated's existing grant list
-- (the grants there have been per-column since supabase-premium.sql), so it is written
-- only by the service role - no revoke is needed.
alter table public.profiles
  add column if not exists paypal_subscription_id text;
