-- tiyul+ · Setup for short share-link storage (Supabase)
-- Run once in the Supabase project's SQL Editor, then set
-- SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
-- in .env.local / Vercel (see .env.example).
--
-- ## A note written after a real bug (2026-08-11)
--
-- The first version of this file carried two unconditional policies for anon,
-- one of them named "anyone can read a share link by code" with `using (true)` -
-- i.e. **every** row, not a row by code. The result: anyone holding the anon
-- key, which is sent with every page we serve, could pull all the share links
-- on the site.
--
-- The lesson, and the reason this file now looks the way it does: **"you must
-- know the code" is not a condition RLS can express.** A policy receives a row,
-- not a query, so it has no way to demand that the reader specified `code`.
-- Any phrasing that permits one row permits them all. Therefore the read goes
-- through a function that takes a code, and the write goes through our server.
--
-- An existing project that already ran the old version: run `supabase-rls-fix.sql`.
-- Verification in both cases: `scripts/rls-audit.sql` (read-only).

create table if not exists public.shared_trips (
  code text primary key,
  payload text not null,           -- The link's encoded payload (v1 base64url)
  created_at timestamptz not null default now()
);

-- RLS is on **with no policy at all**. That is a "nobody" state, not an
-- "everybody" state: service_role bypasses RLS by definition, so our server
-- works and everyone else does not.
alter table public.shared_trips enable row level security;

drop policy if exists "anyone can read a share link by code" on public.shared_trips;
drop policy if exists "anyone can create share links" on public.shared_trips;

-- RLS filters rows; GRANT decides whether touching the table is allowed at all.
-- The revoke is the layer that keeps protecting even if someone adds a broad
-- policy in the future.
revoke all on public.shared_trips from anon, authenticated;

-- The server's permission is stated explicitly and does not rely on default privileges.
grant select, insert on public.shared_trips to service_role;

-- ---------- Reading: by code, and only by code ----------
create or replace function public.get_shared_trip(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select payload
  from public.shared_trips
  where p_code ~ '^[a-zA-Z0-9]{6,12}$'
    and code = p_code
  limit 1;
$$;

-- Postgres's default gives execute to public (i.e. to every role, including
-- ones created in the future), so the revoke must precede the grant.
revoke all on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_trip(text) to anon, authenticated, service_role;

-- ---------- Writing ----------
-- There is no insert policy, deliberately. Link creation goes through /api/share
-- with the service role, i.e. always behind the quotas. An unconditional anon
-- insert would allow filling the table from the browser with no gate at all.

-- In the future (accounts): alter table add column user_id uuid references auth.users,
-- and a policy letting the owner manage their own links.
