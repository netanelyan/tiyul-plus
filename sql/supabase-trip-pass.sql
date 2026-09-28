-- ============================================================
--  tiyul+ - the trip pass (one trip, everything, 60 days, ILS 49)
--  Run in Supabase -> SQL Editor. Safe to run twice.
-- ============================================================
--
--  What this file does, and it is only one thing:
--  Widens the CHECK constraint on profiles.plan_source to include 'trip_pass'.
--
--  Why that is needed at all: a trip pass grants premium for a fixed window, and
--  the codebase already supports a time-limited premium - effectivePlan() has
--  honoured plan_until since admin grants existed. So no new column, no new table
--  and no new tier. The only thing standing in the way is this constraint, which
--  currently allows ('stripe','grant','promo','paypal'); without the widening the
--  grant is rejected by the database and the buyer pays and gets nothing.
--
--  Why 'trip_pass' and NOT 'paypal', even though a pass is paid through PayPal:
--  plan_source = 'paypal' is the guard that lets the subscription webhook
--  downgrade an account on BILLING.SUBSCRIPTION.CANCELLED, and the guard that lets
--  /api/billing/cancel act. A pass is a one-off that expires by itself and can
--  never be cancelled. Filing it as 'paypal' would expose it to a subscription
--  cancellation it has nothing to do with, and would offer its buyer a cancel
--  button that revokes something they already paid for in full. The value has to
--  be distinguishable, which is the same reasoning that gave 'grant' and 'promo'
--  their own values rather than reusing 'stripe'.
--
--  Nothing else is needed. purchases.product is free text (default
--  'predeparture-check'), so a pass row simply carries product='trip-pass', and
--  purchases.source stays 'paypal' because a pass IS real revenue - unlike
--  'admin_grant' and 'premium_included', which are deliberately amount=0 and
--  excluded from the financial report.
--
--  The old constraint was created inline (add column ... check (...)), so it has a
--  generated name that differs between installations. It is located via
--  pg_constraint rather than guessed - the same pattern as supabase-paypal-subs.sql
--  and supabase-premium-budget.sql, for the same reason.

do $$
declare
  real_name text;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'public.profiles does not exist - run supabase-profiles.sql and supabase-admin.sql first, then this file again.';
    return;
  end if;

  -- Find the actual name of the CHECK constraint that covers plan_source.
  select con.conname
    into real_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and att.attname = 'plan_source'
  limit 1;

  if real_name is not null then
    execute format('alter table public.profiles drop constraint %I', real_name);
  end if;

  alter table public.profiles
    add constraint profiles_plan_source_check
    check (
      plan_source is null
      or plan_source in ('stripe', 'grant', 'promo', 'paypal', 'trip_pass')
    );

  raise notice 'plan_source now allows trip_pass.';

  /*
    The readiness flag, set LAST and only on the success path.

    /api/pass/create-order refuses to sell a pass unless this is true, so the deploy
    cannot take money for a grant the database would reject. It is inside the same
    DO block as the constraint widening on purpose: if the alter above raises, this
    never runs and the pass stays unsellable.
  */
  if to_regclass('public.app_flags') is not null then
    insert into public.app_flags (key, value)
    values ('trip_pass_ready', 'true'::jsonb)
    on conflict (key) do update set value = 'true'::jsonb, updated_at = now();
    raise notice 'trip_pass_ready flag set - the pass is now sellable.';
  else
    raise notice 'public.app_flags is missing - run supabase-admin.sql, then this file again. The pass stays unsellable until then.';
  end if;
end
$$;

-- ---------- Verification ----------
--  The pass is sellable only when BOTH are true. Check the flag too, not just the
--  constraint: if app_flags was missing when this ran, the constraint is widened and
--  the flag is not, and /api/pass/create-order still refuses every sale.
--
--    select value from public.app_flags where key = 'trip_pass_ready';   -- expect true
--
--  This should return one row, and its definition should contain 'trip_pass':
--
--    select conname, pg_get_constraintdef(oid)
--    from pg_constraint
--    where conrelid = 'public.profiles'::regclass and contype = 'c';
--
--  And this should succeed rather than raise a check violation (roll it back -
--  it is only here to prove the constraint accepts the new value):
--
--    begin;
--    update public.profiles set plan_source = 'trip_pass' where false;
--    rollback;
--
--  `sql/supabase-check.sql` reports whether this file has been run.
