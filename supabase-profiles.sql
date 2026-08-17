-- tiyul+ - step 3: user profile (the account area)
-- Run once in the SQL Editor (after supabase-setup.sql and supabase-accounts.sql).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  -- Profile picture as a downscaled data URL (compressed on the client to ~20KB);
  -- moving to Supabase Storage is a transparent future upgrade
  avatar text,
  -- Country codes (ISO2) the user has visited - the "passport stamps" feature
  visited jsonb not null default '[]',
  -- The account's default preferences (for example kosher)
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

create policy "own profile insert" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);

create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
