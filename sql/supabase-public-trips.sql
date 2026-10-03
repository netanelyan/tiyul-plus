-- ============================================================
--  tiyul+ - public trips (an owner-published, indexable trip page)
--  Run in Supabase -> SQL Editor. Safe to run twice.
-- ============================================================
--
--  What this adds: one table, `public_trips`, holding the STRIPPED snapshot of a
--  trip whose owner explicitly asked for it to be published at /trips/<slug>.
--
--  ## Why the snapshot is a copy and not a reference to user_trips
--
--  The obvious design is a `published boolean` column on user_trips, and it is
--  wrong in a way that only shows up later: the public page would then render
--  whatever the trip currently contains. Every subsequent edit - adding the hotel
--  as a pin, writing a note with a confirmation number, setting the real dates -
--  would publish itself silently, and the consent the owner gave was about the
--  trip as it was at that moment.
--
--  A snapshot means publishing is an event with a boundary. The owner can see
--  what is public, and nothing they do afterwards leaks without a second, explicit
--  publish. It also means the public page never touches the private table.
--
--  ## Unpublish is a tombstone, not a delete
--
--  `unpublished_at` is set and the row stays. The page then answers **410 Gone**
--  rather than 404, which is the difference between telling a crawler "this URL is
--  finished, drop it" and "try again later". A deleted row could only ever produce
--  a 404, and the brief asks for 410. The snapshot is cleared at the same moment,
--  so an unpublished trip stops existing as data while its slug keeps its meaning.
--
--  ## RLS
--
--  Enabled with NO policy at all, exactly like shared_trips: that is a "nobody"
--  state, not an "everybody" state, because service_role bypasses RLS by
--  definition. Our server reads and writes; no browser can touch this table with
--  the anon key, not even to read - the public page is rendered on the server.
--
--  Reads go through a security-definer function so that "one row per slug" is
--  structure rather than convention, and so the anon key can never be pointed at
--  the table to enumerate every published trip and its owner.

create table if not exists public.public_trips (
  slug          text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- The owner's trip id. Used to find an existing publication for a trip, and to
  -- stop one trip occupying several public URLs.
  trip_id       text not null,
  -- The stripped snapshot. See lib/trip/publicTrip.ts - it carries city slugs,
  -- catalog place ids and a month. No names, no notes, no pins, no preferences.
  snapshot      jsonb not null,
  -- Denormalised so the city listing and the sitemap do not parse JSON per row.
  city_slug     text not null,
  day_count     int  not null,
  stop_count    int  not null,
  -- Whether crawlers may index it. Computed by the server from the stop count and
  -- the catalog; stored so the sitemap is one query.
  indexable     boolean not null default false,
  published_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Non-null = withdrawn. The row stays so the slug can answer 410.
  unpublished_at timestamptz
);

-- One live publication per trip. A partial unique index rather than a plain one:
-- a trip that was unpublished must be publishable again, and that second row is
-- legitimate.
create unique index if not exists public_trips_one_live_per_trip
  on public.public_trips (user_id, trip_id)
  where unpublished_at is null;

-- The city listing ("latest 6 public trips for this city") and the sitemap.
create index if not exists public_trips_city_idx
  on public.public_trips (city_slug, published_at desc)
  where unpublished_at is null and indexable;

create index if not exists public_trips_sitemap_idx
  on public.public_trips (updated_at desc)
  where unpublished_at is null and indexable;

alter table public.public_trips enable row level security;

-- RLS filters rows; GRANT decides whether the table may be touched at all. The
-- revoke is the layer that keeps protecting if somebody later adds a broad policy.
revoke all on public.public_trips from anon, authenticated;
grant select, insert, update on public.public_trips to service_role;

-- ------------------------------------------------------------------
--  Read one published trip by slug.
--
--  security definer + a pinned search_path, per the project rule. No dynamic SQL:
--  the slug is a parameter throughout, never concatenated.
--
--  Returns the row even when it is unpublished, with unpublished_at set, because
--  the caller needs to tell 410 from 404 - and that distinction is the whole
--  reason the tombstone exists.
-- ------------------------------------------------------------------
create or replace function public.get_public_trip(p_slug text)
returns table (
  slug text,
  snapshot jsonb,
  city_slug text,
  day_count int,
  stop_count int,
  indexable boolean,
  published_at timestamptz,
  updated_at timestamptz,
  unpublished_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.slug, t.snapshot, t.city_slug, t.day_count, t.stop_count,
         t.indexable, t.published_at, t.updated_at, t.unpublished_at
  from public.public_trips t
  where t.slug = p_slug
  limit 1;
$$;

revoke all on function public.get_public_trip(text) from public;
grant execute on function public.get_public_trip(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------------
--  The publication belonging to one of an owner's trips, if any.
--
--  Drives three things: the toggle's current state, "re-publishing keeps the
--  existing slug", and unpublish. Filtered on BOTH user and trip - this is the
--  lookup that decides which row a write then touches, so it must never be able
--  to return somebody else's.
--
--  Returns the unpublished row too, so the caller can tell "never published"
--  from "withdrawn" without a second query.
-- ------------------------------------------------------------------
create or replace function public.get_public_trip_for_trip(p_user uuid, p_trip text)
returns table (slug text, indexable boolean, unpublished_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select t.slug, t.indexable, t.unpublished_at
  from public.public_trips t
  where t.user_id = p_user
    and t.trip_id = p_trip
  order by t.published_at desc
  limit 1;
$$;

revoke all on function public.get_public_trip_for_trip(uuid, text) from public;
grant execute on function public.get_public_trip_for_trip(uuid, text) to service_role;

-- ------------------------------------------------------------------
--  The latest indexable trips for one city - the "travellers' trips" block.
--  Bounded inside the function so a caller cannot ask for ten thousand rows.
-- ------------------------------------------------------------------
create or replace function public.list_public_trips_for_city(p_city text, p_limit int default 6)
returns table (
  slug text,
  day_count int,
  stop_count int,
  snapshot jsonb,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.slug, t.day_count, t.stop_count, t.snapshot, t.published_at
  from public.public_trips t
  where t.city_slug = p_city
    and t.unpublished_at is null
    and t.indexable
  order by t.published_at desc
  limit least(greatest(coalesce(p_limit, 6), 1), 24);
$$;

revoke all on function public.list_public_trips_for_city(text, int) from public;
grant execute on function public.list_public_trips_for_city(text, int) to anon, authenticated, service_role;

-- ------------------------------------------------------------------
--  Every indexable published trip, for the sitemap. Bounded for the same reason.
-- ------------------------------------------------------------------
create or replace function public.list_public_trips_sitemap(p_limit int default 5000)
returns table (slug text, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select t.slug, t.updated_at
  from public.public_trips t
  where t.unpublished_at is null
    and t.indexable
  order by t.updated_at desc
  limit least(greatest(coalesce(p_limit, 5000), 1), 50000);
$$;

revoke all on function public.list_public_trips_sitemap(int) from public;
grant execute on function public.list_public_trips_sitemap(int) to anon, authenticated, service_role;

-- ------------------------------------------------------------------
--  How many trips this account has published in a window - the per-account half
--  of the anti-spam limit. The in-memory limiter in lib/server/limits.ts resets
--  on every deploy and is per-instance; this one is neither.
-- ------------------------------------------------------------------
create or replace function public.count_recent_publications(p_user uuid, p_since timestamptz)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.public_trips t
  where t.user_id = p_user
    and t.published_at >= p_since;
$$;

revoke all on function public.count_recent_publications(uuid, timestamptz) from public;
grant execute on function public.count_recent_publications(uuid, timestamptz) to service_role;
