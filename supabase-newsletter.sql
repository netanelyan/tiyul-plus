-- ============================================================
--  tiyul+'s mailing list
--  Run in Supabase → SQL Editor. Idempotent, safe to run again.
-- ============================================================
--
--  Where the addresses are stored: in the `newsletter_signups` table in the
--  Supabase project already serving the accounts and the share links. No
--  external provider and no new dependency - it is the same database.
--
--  **The table is completely closed to the public.** There is no policy for
--  anon and none for authenticated, meaning it cannot be read from and
--  cannot be written to from the browser. Signup goes through
--  `/api/newsletter` on the server, with the service role key - so nobody
--  can pull the address list through the public API, and that is the whole
--  point for a table holding people's email addresses.

create table if not exists public.newsletter_signups (
  email       text primary key,
  created_at  timestamptz not null default now(),
  -- Where they signed up from (footer / a future landing page), for insight only
  source      text,
  -- Unsubscribe without deleting the row, so we do not accidentally send again
  unsubscribed_at timestamptz
);

alter table public.newsletter_signups enable row level security;

-- No policies on purpose: RLS enabled with no policy = nobody but the
-- service role can see or write. If somebody adds an anon policy here, they
-- open the address list to the world - do not do that.
revoke all on public.newsletter_signups from anon, authenticated;

create index if not exists newsletter_signups_created_at_idx
  on public.newsletter_signups (created_at desc);
