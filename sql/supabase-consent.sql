-- ============================================================
-- tiyul+ - consent to the terms of use and the privacy policy
-- Run in Supabase's SQL Editor (idempotent - safe to run again).
-- Prerequisite: supabase-profiles.sql has already run (the profiles table exists).
-- ============================================================

-- Two columns only: when the terms were first accepted, and for which version - the date
-- shown as "last updated" on the /terms page at the time of acceptance (see
-- src/lib/legal.ts). It is not overwritten on a subsequent sign-in - the code writes it
-- once, on the first login where no consent has yet been recorded for that account.
--
-- There is no new RLS here: the columns sit in the existing profiles table, which is
-- already protected by "own profile update"/"own profile insert" (auth.uid() = user_id) -
-- i.e. a user can write consent only for their own account.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

-- ------------------------------------------------------------
-- The grants, which the first version of this file forgot - and the omission was
-- silent in the worst way.
--
-- RLS is NOT the only gate on this table. `supabase-premium.sql` and
-- `supabase-admin.sql` both REVOKE table-level insert/update from `authenticated`
-- and then grant them COLUMN BY COLUMN, so that nobody can write `role`, `plan`
-- or `stripe_customer_id` to themselves. Postgres does not extend a column-level
-- grant to a column added afterwards, so these two arrived writable by nobody.
--
-- The comment above used to say consent behaves "exactly as with a display name".
-- That was the error: `display_name` is IN the grant list and these were not.
--
-- What it looked like: the migration runs, the columns appear, and consent is
-- still never recorded - because `recordTermsAcceptance` returns false on the
-- permission error and its caller deliberately ignores the result, so that a
-- database that has not been migrated can never block somebody from logging in.
-- Nothing anywhere says no.
--
-- GRANT is idempotent, so running this file again is safe and is what fixes an
-- installation that already ran the first version.
grant insert (terms_accepted_at, terms_version) on table public.profiles to authenticated;
grant update (terms_accepted_at, terms_version) on table public.profiles to authenticated;
