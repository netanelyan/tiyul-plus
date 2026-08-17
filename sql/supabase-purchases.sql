-- tiyul+ · Pre-departure check: the purchases table · 2026-08-12
--
-- ############################################################
-- Run once in the SQL Editor. Idempotent - safe to run again.
-- ############################################################
--
-- The site's first paid product: a one-time purchase of the "pre-departure
-- check" for a specific trip. One row = one purchase attempt.
--
-- ## The single rule this table exists to enforce
--
-- **Granting access happens only as a result of a verified PayPal webhook
-- (or an explicit admin action), never from a call arriving directly from
-- the browser.** Which is why this table has no RLS policy at all for
-- `anon` or `authenticated` - RLS enabled with no policy means "nobody",
-- exactly like the `shared_trips` fix (see `supabase-rls-fix.sql`). All
-- reads and writes go exclusively through the API routes with the service
-- role, which bypasses RLS by definition. There is no way here for a user
-- to read their own row directly from the browser - `/api/checks/status`
-- is the only way, and it returns only a narrow subset.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id text not null,               -- Trip.id from the app (not a foreign key - the trip lives in user_trips)
  product text not null default 'predeparture-check',
  amount numeric(10,2) not null,       -- what was actually charged. 0 for source='admin_grant'.
  currency text not null default 'ILS',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'revoked')),
  -- 'paypal' = a real payment; 'admin_grant' = a manual grant from /admin;
  -- 'premium_included' = an automatic premium-subscription perk. The latter
  -- two are **not** real revenue (amount=0) - that distinction is what keeps
  -- the financial report correct, by exactly the same principle as
  -- plan_source in supabase-premium.sql, and they are counted separately
  -- from each other to distinguish human support from a subscription perk.
  -- The list here must stay in sync with PurchaseSource in
  -- lib/server/purchases.ts; for an installation that ran with the old
  -- version, supabase-premium-budget.sql widens the constraint - the two
  -- files are safe in any run order.
  source text not null default 'paypal'
    check (source in ('paypal', 'admin_grant', 'premium_included')),
  -- Which PayPal environment this happened in. A purchase created under
  -- sandbox can never be considered paid by code running under production,
  -- and vice versa - see the note about this in server/paypal.ts
  -- (sandboxBlocked).
  mode text not null default 'sandbox'
    check (mode in ('sandbox', 'production')),
  paypal_order_id text unique,         -- set immediately at order creation
  paypal_capture_id text unique,       -- set only from the webhook - this is what guarantees the same capture is never credited twice
  paypal_payer_email text,
  -- A snapshot of the check **at grant time** - not recomputed on every
  -- view, so that "the report you received" stays stable even if the
  -- catalog changes afterward.
  report jsonb,
  raw_webhook jsonb,                   -- the raw payload, for answering a question half a year from now
  note text,                           -- an admin note on a manual grant/revocation
  granted_by uuid references auth.users (id), -- which staff member performed a manual grant/revocation, if any
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_trip_idx on public.purchases (user_id, trip_id);
create index if not exists purchases_pending_idx on public.purchases (created_at) where status = 'pending';

alter table public.purchases enable row level security;

-- No policy on purpose - see the explanation above. GRANT is declared
-- explicitly and does not rely on a default permission, for the same reason
-- recorded in supabase-rls-fix.sql: "the server still works" is exactly the
-- thing that must not depend on an assumption.
revoke all on public.purchases from anon, authenticated;
grant select, insert, update on public.purchases to service_role;

-- ---------- Verification ----------
-- Run afterwards, if you want to verify: `select * from public.purchases limit 1;`
-- As a regular authenticated user (not service_role) it must fail/return empty.
