-- ============================================================
-- supabase-trips-check.sql - "I deleted trips and they came back"
--
-- READ-ONLY. Shows what your account actually holds right now:
-- which rows are live trips and which are deletion tombstones.
--
-- Paste into the Supabase SQL Editor and Run.
--
-- HOW TO READ IT
--   kind = 'tombstone'  the deletion IS recorded on the server.
--                       If a trip is back on your screen with a
--                       tombstone row here, that is a live bug -
--                       tell Claude, this file is the evidence.
--   kind = 'trip'       the server still holds the trip. If you
--                       deleted it before the tombstone fix
--                       shipped (2026-07-27), the deletion only
--                       ever happened in that one browser, so the
--                       next sign-in legitimately brought it back.
--                       Deleting it again now sticks.
--
-- last_touched vs deleted_at matters: an edit NEWER than a
-- deletion deliberately wins, on purpose, in both directions.
-- ============================================================

select
  u.email,
  case when t.data ? 'deletedAt' then 'tombstone' else 'trip' end            as kind,
  coalesce(t.data ->> 'name', '(no name)')                                   as name,
  jsonb_array_length(coalesce(t.data -> 'days', '[]'::jsonb))                as days,
  to_timestamp(((t.data ->> 'deletedAt')::bigint) / 1000)                    as deleted_at,
  to_timestamp(((t.data ->> 'updatedAt')::bigint) / 1000)                    as last_edited,
  t.updated_at                                                               as row_updated,
  t.id
from public.user_trips t
join auth.users u on u.id = t.user_id
where u.email = 'natikyan153@gmail.com'   -- change if you check another account
order by kind, t.updated_at desc;
