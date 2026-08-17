-- tiyul+ · closing an RLS exposure · 2026-08-11
--
-- ############################################################
-- Run once in the SQL Editor. Idempotent - safe to run again.
-- ############################################################
--
-- ## What was open
--
-- `shared_trips` carried two policies for anon, both unconditional:
--
--     create policy "anyone can read a share link by code"
--       on public.shared_trips for select to anon using (true);
--
-- **The name describes an intent the condition does not express.**
-- `using (true)` is not "by code" - it is "every row". Meaning anyone
-- holding the anon key, which is shipped with every page we serve, could
-- pull *all* of the site's share links in a single request, not just open
-- a specific code.
--
-- And the insert was likewise `with check (true)`, i.e. unrestricted
-- writes straight from the browser - bypassing the quotas in `/api/share`.
--
-- ## Why a policy alone cannot fix this
--
-- "Must know the code" is not a condition expressible in RLS. A policy
-- receives the row, not the query, so it cannot require that the caller
-- specified `code`. Any wording that allows reading one row allows reading
-- all of them.
--
-- Therefore: **the policy is removed entirely**, and "knowing the code" is
-- enforced in the only place that can enforce it - a function that takes a
-- code and returns a single row.
--
-- ## What remains possible after this file
--
--   Read   - only via `public.get_shared_trip(code)`, which returns one
--            payload and nothing else. It has no list-returning variant.
--   Write  - only via our server with the service role, i.e. always behind
--            the quotas of `/api/share`.
--
-- Requires: SUPABASE_SERVICE_ROLE_KEY in Vercel. Without it, short-link
-- creation is silently off and the client falls back to the long link,
-- which keeps working in full.

-- ---------- 1. Removing the two policies ----------

drop policy if exists "anyone can read a share link by code" on public.shared_trips;
drop policy if exists "anyone can create share links" on public.shared_trips;

-- RLS stays enabled **with no policy at all**: that is a "nobody" state,
-- not an "everybody" state. service_role bypasses RLS by definition, so our
-- server keeps working.
alter table public.shared_trips enable row level security;

-- ---------- 2. Revoking the privilege itself, not just the policy ----------

-- RLS filters rows; GRANT decides whether the table may be touched at all.
-- Revoking the privilege is the layer that keeps protecting even if someone
-- adds a broad policy in the future.
revoke all on public.shared_trips from anon, authenticated;

-- The server's privilege is stated explicitly rather than relying on
-- default privileges. It exists in Supabase anyway, but "the server still
-- works" is exactly the thing that must not depend on an assumption - this
-- file's local test failed on it.
grant select, insert on public.shared_trips to service_role;

-- ---------- 3. Reading by code, and only by code ----------

create or replace function public.get_shared_trip(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select payload
  from public.shared_trips
  -- The same code shape the server generates. Input not in this shape never
  -- reaches the table at all, so there is no way to phrase a pattern here
  -- that returns more than one row.
  where p_code ~ '^[a-zA-Z0-9]{6,12}$'
    and code = p_code
  limit 1;
$$;

-- `public` includes every future role. Postgres's default grants execute to
-- public, so this revoke must come before the explicit grant.
revoke all on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_trip(text) to anon, authenticated, service_role;

-- ---------- 3b. Self-test, here and not in the audit file ----------
--
-- Postgres resolves a function name at parse time, so a line that calls
-- get_shared_trip fails with "function does not exist" if it runs before
-- the function was created. The only place the call is safe is here, right
-- after creation - and a migration that fails on its own self-test is
-- exactly the desired behavior.
do $$
begin
  if public.get_shared_trip('') is not null
     or public.get_shared_trip('%') is not null      -- LIKE wildcard
     or public.get_shared_trip('_') is not null      -- single-character wildcard
     or public.get_shared_trip('.*') is not null     -- regex pattern
     or public.get_shared_trip(repeat('a', 13)) is not null
  then
    raise exception 'get_shared_trip החזירה תוצאה לקלט שאינו קוד';
  end if;
end
$$;

-- ---------- 4. public_profiles: removing anonymous access ----------
--
-- The view was created without `security_invoker`, so it bypasses RLS. That
-- is **not** the bug, nor what should change: `security_invoker = true`
-- would subject it to the RLS of `profiles`, which is own-row-only, and
-- disable traveler search entirely.
--
-- What it does expose: `user_id`, `display_name`, `avatar`, `visited` of
-- everyone with `is_public = true`. No email, no phone, no trips. The
-- problem is that with `grant ... to anon` the **entire** list can be
-- pulled in one request - a library of names and photos ripe for scraping.
-- Traveler search lives behind login anyway.
revoke select on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------- 5. Verification ----------
-- Afterwards run `scripts/rls-audit.sql`. It is read-only and prints one
-- OK / PROBLEM line per check.
