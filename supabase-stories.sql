-- ============================================================
--  tiyul+ - the trip story (a premium feature)
--  Run in Supabase -> SQL Editor. Safe to run twice.
-- ============================================================
--
--  After the trip, it becomes a public story page: the route on a map, the days,
--  and photos the travellers uploaded of the places they visited. Creating requires
--  premium (enforced on the server, not here); viewing is free for anyone who got a
--  link - that is this feature's growth engine.
--
--  **A snapshot, not a reference**: the story row carries a copy of the trip's data
--  (name, days, stops) as they were at the moment of publishing. A public page that
--  read the user's live trip would expose every future edit of it to the world - and
--  would also break when the trip is deleted.

create table if not exists public.trip_stories (
  slug        text primary key,             -- קצר, אקראי, בקישור הציבורי
  user_id     uuid not null,
  trip_id     text not null,
  title       text not null,
  -- A snapshot of the trip for the public render: { name, days: [{cityName, citySlug, stops:[{name,...}]}], startDate?, endDate? }
  trip_data   jsonb not null,
  -- Photos: [{ path, dayNumber?, caption? }] - path inside the story-photos bucket
  photos      jsonb not null default '[]'::jsonb,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, trip_id)                 -- סיפור אחד לטיול
);

alter table public.trip_stories enable row level security;
-- All writes go through the server with the service role (premium enforcement + validation).
-- Public reads of a published story go through the function below, not directly.
revoke all on table public.trip_stories from anon, authenticated;

-- Public read: only a published story, and only the fields the page needs. A function
-- rather than a policy so that ownership fields (user_id, trip_id) are never exposed publicly.
create or replace function public.get_trip_story(p_slug text)
returns table (title text, trip_data jsonb, photos jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select s.title, s.trip_data, s.photos, s.created_at
  from public.trip_stories s
  where s.slug = p_slug and s.published = true;
$$;

grant execute on function public.get_trip_story(text) to anon, authenticated;

-- ---------- The photo bucket ----------
--  Creating the bucket itself happens once here; uploading goes through the server
--  (service role) after validation, so there is no public write policy. Public reads
--  of photos belonging to published stories - the bucket is public for reads.
insert into storage.buckets (id, name, public)
values ('story-photos', 'story-photos', true)
on conflict (id) do nothing;
