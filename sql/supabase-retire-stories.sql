-- tiyul+ - retiring the trip-story feature (OPTIONAL, and it DELETES DATA)
--
-- The trip story was removed from the product on 2026-08-17: the page rendered the
-- itinerary on a public URL and nothing on it came from the traveller, so it was not
-- worth charging for. The code, the route and supabase-stories.sql are gone.
--
-- Nothing in the app reads these objects any more, so leaving them costs nothing and
-- the app works either way. Run this ONLY if you want the database tidy. It is
-- deliberately a separate file and is deliberately not idempotent-by-default in the
-- "run everything" sense - a cleanup that deletes rows should be a decision, not
-- something that happens because somebody re-ran the setup scripts.
--
-- Any story links already shared stop working the moment the route was removed,
-- which happened with the deploy - this file only reclaims the storage.

begin;

-- The public read function first: it depends on the table.
drop function if exists public.get_trip_story(text);

drop table if exists public.trip_stories;

commit;

-- The uploaded story photos live in a storage bucket, which SQL cannot drop while it
-- still has objects. To remove them, either use Storage -> story-photos -> delete in
-- the Supabase dashboard, or run:
--
--   delete from storage.objects where bucket_id = 'story-photos';
--   delete from storage.buckets where id = 'story-photos';
--
-- Those are travellers' own uploaded photographs. Deleting them is irreversible, so
-- it is left as an explicit step rather than included above.
