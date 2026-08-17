-- ============================================================
--  Fixing execute grants on three functions
--
--  ## What the problem is
--
--  In PostgreSQL, a new function gets EXECUTE for **PUBLIC** automatically.
--  `PUBLIC` is neither "nobody" nor "all signed-in users" - it is a
--  super-role that every role inherits from, including `anon` and
--  `authenticated`.
--
--  Three functions in this project were revoked from `anon, authenticated`
--  only:
--
--      revoke all on function public.bump_ai_spend(...) from anon, authenticated;
--
--  Such a revoke removes a **direct** grant, and the function remains
--  available through the grant inherited from PUBLIC. Meaning: anyone
--  holding the public anon key (which ships in the browser bundle on
--  purpose) can call them.
--
--  Measured on a local Postgres 16, not inferred:
--
--      revoke all ... from anon, authenticated   -> has_function_privilege('anon',...,'execute') = t
--      revoke all ... from public, anon, ...     -> has_function_privilege('anon',...,'execute') = f
--
--  And in an actual call: the `anon` role successfully wrote 9999 to a
--  table it has no privileges on whatsoever and whose RLS is on with no
--  policy at all - because the function is `security definer`, which is
--  its entire purpose.
--
--  The two functions that WERE written correctly - `bump_usage` and
--  `redeem_promo`, both revoked `from public, anon, authenticated` from
--  day one - are also the proof this fix is safe: the server calls them
--  through service_role and they work in production.
--
--  ## What this is not
--
--  There is no code change here. This file stands on its own and can be
--  run immediately with no deploy at all - unlike supabase-rls-fix.sql,
--  which had to land together with the code.
--
--  Safe to run even if you have not yet run supabase-ai-spend.sql or
--  supabase-admin-dash.sql: a function that does not exist is simply
--  skipped.
-- ============================================================

do $$
declare
  fn text;
  sig text;
begin
  foreach sig in array array[
    'public.bump_ai_spend(date, numeric, boolean, text)',
    'public.claim_ai_spend_alert(date)',
    'public.bump_event(date, text)'
  ]
  loop
    if to_regprocedure(sig) is null then
      raise notice 'skip (not created yet): %', sig;
      continue;
    end if;
    -- This is the line that was missing
    execute format('revoke all on function %s from public', sig);
    execute format('revoke all on function %s from anon, authenticated', sig);
    -- **Explicit, not inherited.** In the shared_trips fix I relied on
    -- service_role's default privileges and the server got permission
    -- denied. The same mistake is not made twice.
    execute format('grant execute on function %s to service_role', sig);
    raise notice 'fixed: %', sig;
  end loop;
end $$;

-- ---------- find_traveler_by_email: signed-in only, not anonymous ----------
--  Measured on the live database: anon_can_call = true. The original file
--  does revoke `from public`, but in practice the privilege exists - most
--  likely from a run of an earlier version of supabase-community.sql. As
--  long as it is open, anyone holding the anon key can probe email
--  addresses one by one and get the owner's name, picture and country
--  list - without an account. The exact-match requirement prevents blind
--  scanning but not checking an address that is already known.
do $$
declare sig text := 'public.find_traveler_by_email(text)';
begin
  if to_regprocedure(sig) is null then
    raise notice 'skip (not created yet): %', sig;
  else
    execute format('revoke all on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated, service_role', sig);
    if has_function_privilege('anon', sig, 'execute') then
      raise exception 'STILL OPEN TO anon: %', sig;
    end if;
    if not has_function_privilege('authenticated', sig, 'execute') then
      raise exception 'TRAVELER SEARCH BROKEN: authenticated lost %', sig;
    end if;
    raise notice 'fixed: % (authenticated only)', sig;
  end if;
end $$;

-- ---------- Self-verification: fails if anything is left open ----------
do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.bump_ai_spend(date, numeric, boolean, text)',
    'public.claim_ai_spend_alert(date)',
    'public.bump_event(date, text)',
    'public.bump_usage(text, date, bigint)',
    'public.redeem_promo(text, uuid)'
  ]
  loop
    if to_regprocedure(sig) is null then continue; end if;
    if has_function_privilege('anon', sig, 'execute') then
      raise exception 'STILL OPEN TO anon: %', sig;
    end if;
    if has_function_privilege('authenticated', sig, 'execute') then
      raise exception 'STILL OPEN TO authenticated: %', sig;
    end if;
    if not has_function_privilege('service_role', sig, 'execute') then
      raise exception 'SERVER LOST ACCESS: %', sig;
    end if;
  end loop;
  raise notice 'OK - all internal RPCs are service_role only, and the server still has them';
end $$;

-- ---------- What should stay open, on purpose ----------
--  get_shared_trip(text)          -> anon+authenticated. Opens a /t/<code> link.
--  find_traveler_by_email(text)   -> authenticated only. Traveler search.
--  Both were already revoked `from public` and then granted explicitly -
--  the correct pattern.
