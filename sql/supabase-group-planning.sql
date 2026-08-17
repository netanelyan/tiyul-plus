-- ============================================================
--  tiyul+ - planning together on a shared trip
--  Run in Supabase -> SQL Editor. Safe to run twice.
--  Prerequisite: supabase-group-trips.sql (invites, members, votes).
-- ============================================================
--
--  Voting told the organizer THAT somebody objected, never why - so the actual
--  conversation stayed in WhatsApp screenshots. These four tables move it next to
--  the plan:
--
--    comments    - what people think, per stop or as a general thread
--    suggestions - a friend proposes a place; the organizer accepts or dismisses
--    dates       - who can make which candidate date
--    rsvp        - who is actually coming
--
--  Same security shape as the rest of the group feature and as trip_stories was:
--  RLS on with NO policy, everything revoked from anon/authenticated, and every
--  read and write going through the server with the service role after it has
--  checked membership. The invite code is the capability; these tables never
--  decide permission themselves.
--
--  Every row is keyed by (owner_id, trip_id) - the organizer's trip - so deleting
--  a trip's group data is one predicate, and a member of one trip can never be
--  resolved into a member of another.

-- ---------- comments ----------
create table if not exists public.trip_group_comments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,          -- the author; the organizer may comment too
  place_id    text,                   -- null = the general thread, not tied to a stop
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists trip_group_comments_trip_idx
  on public.trip_group_comments (owner_id, trip_id, created_at);

-- ---------- suggestions ----------
--  A friend proposing a place is the difference between "approve my plan" and
--  "plan together". The place_id is validated against the catalog on the server,
--  so a suggestion can never introduce a place that does not exist.
create table if not exists public.trip_group_suggestions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  place_id    text not null,
  city_slug   text not null,
  note        text,
  status      text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  -- One live suggestion per place per member: suggesting the same place twice is
  -- a duplicate, not two opinions.
  unique (owner_id, trip_id, member_id, place_id)
);
create index if not exists trip_group_suggestions_trip_idx
  on public.trip_group_suggestions (owner_id, trip_id, status);

-- ---------- dates ----------
--  The organizer proposes candidate dates on the invite; each member marks the
--  ones that work. Stored per (member, day) rather than as a range, because
--  "I can do the 3rd and the 5th but not the 4th" is the normal answer.
alter table public.trip_group_invites
  add column if not exists date_options text[] not null default '{}';

create table if not exists public.trip_group_dates (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  day         date not null,
  ok          boolean not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id, day)
);

-- ---------- rsvp ----------
create table if not exists public.trip_group_rsvp (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  status      text not null check (status in ('going','maybe','no')),
  updated_at  timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id)
);

alter table public.trip_group_comments    enable row level security;
alter table public.trip_group_suggestions enable row level security;
alter table public.trip_group_dates       enable row level security;
alter table public.trip_group_rsvp        enable row level security;

revoke all on table public.trip_group_comments    from anon, authenticated;
revoke all on table public.trip_group_suggestions from anon, authenticated;
revoke all on table public.trip_group_dates       from anon, authenticated;
revoke all on table public.trip_group_rsvp        from anon, authenticated;
