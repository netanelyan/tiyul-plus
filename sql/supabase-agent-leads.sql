-- ============================================================
--  Travel-agent and trip-organiser enquiries (the "agents" card on /premium)
--  Run in Supabase -> SQL Editor. Idempotent, safe to run again.
-- ============================================================
--
--  WHERE THE ENQUIRIES LAND: the `agent_leads` table in the same Supabase
--  project that already runs the accounts, the share links and the mailing
--  list. No external form provider, no new dependency, no inbox to configure.
--  They are read in /admin, in the travel-agent enquiries card.
--
--  **The table is completely closed to the public**, exactly like
--  newsletter_signups and for a stronger reason: these rows carry a person's
--  name, business, phone number and a free-text description of their
--  business. RLS is on with NO policy at all, and both browser roles have
--  everything revoked - so the only way in or out is the service role, i.e.
--  /api/agent-enquiry (write) and /api/admin/agent-leads (read). A policy
--  added here for anon or authenticated would publish a list of leads
--  including their phone numbers; do not add one.

create table if not exists public.agent_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- What the form asks for. `contact` is one field on purpose: the form takes
  -- an email OR a phone, because forcing both is how a short form stops being
  -- short. Which of the two it is gets recorded in `contact_kind` so the
  -- dashboard can render it as a mailto: or a tel: link.
  name         text not null,
  business     text not null,
  contact      text not null,
  contact_kind text not null check (contact_kind in ('email', 'phone')),

  -- Roughly how many trips a year they plan. A free-text-ish bucket rather
  -- than a number, because "how many trips a year" is genuinely an estimate and a
  -- required integer would push people into inventing one.
  trips_per_year text,

  -- What they need, in their own words. The only field where the actual
  -- business need shows up, so it is the one worth reading first.
  needs        text,

  -- Set when the enquiry has been dealt with, so the dashboard can show the
  -- open ones without deleting anything. Deliberately a timestamp and not a
  -- boolean: "when did we answer" is a question worth being able to ask.
  handled_at   timestamptz,

  -- If they were signed in when they wrote. Nullable and never required - a
  -- travel agent evaluating the product has no reason to have an account yet,
  -- and demanding one is how an enquiry form collects nothing.
  user_id      uuid
);

alter table public.agent_leads enable row level security;

-- No policies, on purpose: RLS on with no policy = nobody except the service
-- role. See the header.
revoke all on public.agent_leads from anon, authenticated;

-- The dashboard reads newest-first, and separately "the ones still open"
create index if not exists agent_leads_created_at_idx
  on public.agent_leads (created_at desc);
create index if not exists agent_leads_open_idx
  on public.agent_leads (created_at desc)
  where handled_at is null;
