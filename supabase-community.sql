-- tiyul+ · Phase 4: traveler community - user search (privacy first)
-- Run once in the SQL Editor (after supabase-profiles.sql).
--
-- Principle: nobody is searchable until they turned on "public profile"
-- in settings. Even then only these are exposed: display name, avatar and
-- the countries passport - never email, phone or trips.

alter table public.profiles
  add column if not exists is_public boolean not null default false;

-- An owner-rights VIEW (bypasses RLS) that exposes only the safe columns
-- and only for profiles that chose to be public - the accepted Supabase
-- pattern for discovery.
create or replace view public.public_profiles as
  select user_id, display_name, avatar, visited
  from public.profiles
  where is_public = true
    and display_name is not null
    and length(trim(display_name)) > 0;

-- **Authenticated users only, deliberately.** The view bypasses RLS (no
-- `security_invoker`), and that is correct: `security_invoker = true`
-- would have subjected it to `profiles`' RLS, which is own-row-only, and
-- disabled traveler search entirely. What WAS problematic is the grant to
-- anon: it allowed pulling the **entire** list in one request - a library
-- of names and photos to scrape, with no account. Search lives behind
-- sign-in anyway, so the anon grant served no real path other than that
-- one. (A project that already ran the old version: the file
-- supabase-rls-fix.sql revokes it.)
revoke select on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- Search by email: exact match only (no partial search - so addresses
-- cannot be scanned), authenticated users only, public profiles only, and
-- the email itself is never returned. SECURITY DEFINER because the emails
-- live in auth.users.
create or replace function public.find_traveler_by_email(p_email text)
returns table (user_id uuid, display_name text, avatar text, visited jsonb)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.display_name, p.avatar, p.visited
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = lower(trim(p_email))
    and p.is_public = true
    and p.display_name is not null
    and length(trim(p.display_name)) > 0
$$;

revoke all on function public.find_traveler_by_email(text) from public;
grant execute on function public.find_traveler_by_email(text) to authenticated;
