-- ============================================================
--  tiyul+ · Shared trip (premium feature for the organizer)
--  Run in Supabase → SQL Editor. Safe to run twice.
-- ============================================================
--
--  The organizer (premium) creates an invite link; signed-in friends join for
--  free, see the trip live and vote 👍/👎 on stops. The organizer sees the
--  results on the trip screen. The code IS the permission (capability) - whoever
--  holds it and is signed in can join; expiry after 30 days limits the exposure
--  window.
--
--  All tables are service-role only: RLS enabled with no policy, and all
--  enforcement (premium, validity, membership) happens on the server - the same
--  structure as trip_stories.

create table if not exists public.trip_group_invites (
  code        text primary key,
  owner_id    uuid not null,
  trip_id     text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  unique (owner_id, trip_id)          -- one active link per trip; re-creating replaces it
);

create table if not exists public.trip_group_members (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  joined_at   timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id)
);

create table if not exists public.trip_group_votes (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  place_id    text not null,
  vote        smallint not null check (vote in (-1, 1)),
  updated_at  timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id, place_id)
);

alter table public.trip_group_invites enable row level security;
alter table public.trip_group_members enable row level security;
alter table public.trip_group_votes   enable row level security;
revoke all on table public.trip_group_invites from anon, authenticated;
revoke all on table public.trip_group_members from anon, authenticated;
revoke all on table public.trip_group_votes   from anon, authenticated;
