-- tiyul+ · The destinations catalog in Supabase (countries, destinations, places)
-- Run once in the SQL Editor. Safe to run again.
--
-- **Scope:** the catalog only. Trips, saved trips and everything the user
-- creates are not touched here at all and stay exactly where they are.
--
-- **The architecture (Netanel's decision, 2026-07-27):** Supabase is the source
-- of truth for editing, but the site keeps reading from `src/data/*.ts`. A
-- script generates the files from the database. The reason: the destination and
-- country pages are generated statically (generateStaticParams, 147 routes), so
-- today the runtime read cost is zero. Reading from Supabase at runtime would
-- add a network round trip where there is none, i.e. slow things down rather
-- than speed them up. Another reason: five 'use client' components import the
-- catalog synchronously at module level, and moving to an async read would
-- require changing the trip screen - which was explicitly ruled out.
--
-- **The shape of the tables deliberately mirrors `src/lib/types.ts` one-to-one.**
-- Fields that are objects or arrays in the TypeScript structure are stored as
-- jsonb and not split into separate tables, so the migration is a pure copy
-- with no judgment calls. `position` preserves the original order, because the
-- order in the catalog is editorial content.

-- ---------- Countries ----------
create table if not exists public.catalog_countries (
  slug        text primary key,
  position    integer not null,
  name        text not null,
  name_local  text not null,
  flag        text not null,
  tagline     text not null,
  summary     text not null,
  photo       text,
  practical   jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- Destinations ----------
create table if not exists public.catalog_destinations (
  slug             text primary key,
  position         integer not null,
  name             text not null,
  name_local       text not null,
  country_slug     text not null references public.catalog_countries(slug) on delete restrict,
  flag             text not null,
  center           jsonb not null,
  zoom             integer not null,
  tagline          text not null,
  summary          text not null,
  best_season      text not null,
  photo            text,
  iconic_landmark  jsonb,
  editorial_rating jsonb,
  itinerary        jsonb not null,
  practical        jsonb not null,
  updated_at       timestamptz not null default now()
);

create index if not exists catalog_destinations_country_idx
  on public.catalog_destinations (country_slug);

-- ---------- Places ----------
-- Composite primary key: place ids are unique across the whole catalog today,
-- but pinning them to a destination prevents a future collision and mirrors the
-- nested structure in the source.
create table if not exists public.catalog_places (
  destination_slug    text not null references public.catalog_destinations(slug) on delete cascade,
  id                  text not null,
  position            integer not null,
  name                text not null,
  name_local          text not null,
  category            text not null,
  lat                 double precision not null,
  lng                 double precision not null,
  description         text not null,
  rating              double precision,
  duration_min        integer,
  kosher_note         text,
  kosher_verification jsonb,
  external_url        text,
  photo               text,
  price_level         integer,
  tags                jsonb,
  must_see            boolean,
  updated_at          timestamptz not null default now(),
  primary key (destination_slug, id)
);

create index if not exists catalog_places_destination_idx
  on public.catalog_places (destination_slug);

-- ---------- RLS: read-only for the public ----------
-- The catalog is editorial content. The browser needs to read it and never
-- write it. Writing happens only through the upload script with the service
-- role key, which bypasses RLS by definition and therefore neither needs nor
-- gets a policy here.
alter table public.catalog_countries    enable row level security;
alter table public.catalog_destinations enable row level security;
alter table public.catalog_places       enable row level security;

drop policy if exists catalog_countries_read    on public.catalog_countries;
drop policy if exists catalog_destinations_read on public.catalog_destinations;
drop policy if exists catalog_places_read       on public.catalog_places;

create policy catalog_countries_read
  on public.catalog_countries for select to anon, authenticated using (true);
create policy catalog_destinations_read
  on public.catalog_destinations for select to anon, authenticated using (true);
create policy catalog_places_read
  on public.catalog_places for select to anon, authenticated using (true);

-- There is no policy for insert/update/delete, so they are completely blocked
-- for anon and authenticated. That is not an omission - that is the point.
revoke insert, update, delete on public.catalog_countries    from anon, authenticated;
revoke insert, update, delete on public.catalog_destinations from anon, authenticated;
revoke insert, update, delete on public.catalog_places       from anon, authenticated;

grant select on public.catalog_countries    to anon, authenticated;
grant select on public.catalog_destinations to anon, authenticated;
grant select on public.catalog_places       to anon, authenticated;
