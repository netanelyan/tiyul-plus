-- tiyul+ - step 2: user accounts - the synced trips table
-- Run once in the Supabase project's SQL Editor (after supabase-setup.sql).
--
-- Also, under Authentication -> Sign In / Up: make sure Email is enabled.
-- Logging in on the site is by a one-time code sent to the email address (OTP) - no passwords.

create table if not exists public.user_trips (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,                 -- Trip.id מהאפליקציה
  data jsonb not null,              -- אובייקט הטיול המלא
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_trips enable row level security;

-- Every user sees and manages only their own rows. The client does not send user_id
-- on read/delete calls - RLS derives the identity from the token.
create policy "own trips select" on public.user_trips
  for select to authenticated using (auth.uid() = user_id);

create policy "own trips insert" on public.user_trips
  for insert to authenticated with check (auth.uid() = user_id);

create policy "own trips update" on public.user_trips
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own trips delete" on public.user_trips
  for delete to authenticated using (auth.uid() = user_id);
