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
-- i.e. a user can write consent only for their own account, exactly as with a display
-- name or a phone number.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;
