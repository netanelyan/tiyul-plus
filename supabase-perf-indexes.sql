-- tiyul+ · Indexes for queries that already exist in the code and run without a supporting index
-- Run once in Supabase → SQL Editor. Idempotent - safe to run again,
-- **and in any execution order**: each index is created only if its table
-- already exists, with a notice when skipping - so the file does not fail if
-- supabase-ai-spend.sql or supabase-purchases.sql have not been run yet.
-- After running those, run this file again and the skipped indexes get
-- created. (This is the same lesson recorded in the log about
-- supabase-admin.sql: a "prerequisite" note is not a dependency - a file must
-- either not depend on order, or check for itself.) For verification:
-- supabase-check.sql.
--
-- All three were found by the same method: read every query the code sends to
-- PostgREST and check whether an index exists that covers its WHERE/ORDER BY.
-- None of them blocks functionality today - the tables are still small - but
-- all three grow without bound (one row per AI call / purchase / public
-- profile), and a full scan whose cost grows linearly with the row count is
-- exactly the kind of slowdown you do not see until it already hurts.

-- The extension does not depend on any table - stays outside the conditional block.
-- (Required for the name-search index below; available in every Supabase project.)
create extension if not exists pg_trgm;

do $$
begin
  -- ---------- 1. lastHeavyCallAt() in lib/server/budget.ts ----------
  -- The query: `ai_spend?route=eq.chat&select=at&order=at.desc&limit=1`
  -- (and sometimes also `identity=neq.system:warm`). Runs on the warm-up
  -- path, i.e. at the highest frequency of any query in this document. The
  -- existing indexes on ai_spend are (day desc), (user_id, day desc) and
  -- (trip_id, day desc) - none of them covers filtering by route with a sort
  -- by at, so without this the query performs a full table scan + sort on
  -- every call. One row is written per real model call, so the cost grows
  -- without pause.
  if to_regclass('public.ai_spend') is not null then
    create index if not exists ai_spend_route_at_idx
      on public.ai_spend (route, at desc);
  else
    raise notice 'public.ai_spend לא קיימת - מדלגים על האינדקס שלה. להריץ supabase-ai-spend.sql ואז את הקובץ הזה שוב.';
  end if;

  -- ---------- 2. recentPurchases() in lib/server/purchases.ts ----------
  -- The query: `purchases?select=...&order=created_at.desc&limit=N` with no
  -- filter at all - this is the "recent purchases" listing in the admin
  -- dashboard (/api/admin/purchases). The existing indexes are
  -- (user_id, trip_id) and a partial index on created_at only where
  -- status='pending' - neither serves a global sort by created_at over the
  -- whole table.
  if to_regclass('public.purchases') is not null then
    create index if not exists purchases_created_idx
      on public.purchases (created_at desc);
  else
    raise notice 'public.purchases לא קיימת - מדלגים על האינדקס שלה. להריץ supabase-purchases.sql ואז את הקובץ הזה שוב.';
  end if;

  -- ---------- 3. searchPublicProfiles() in lib/auth/profile.ts ----------
  -- The query: `.ilike('display_name', '%q%')` - the community traveler
  -- search. The leading `%` rules out a regular btree index (btree cannot
  -- shortcut a search that does not start from the first character).
  -- pg_trgm + GIN is the right way to do partial-text search in
  -- Postgres/Supabase, with no new npm dependency.
  if to_regclass('public.profiles') is not null then
    create index if not exists profiles_display_name_trgm_idx
      on public.profiles using gin (display_name gin_trgm_ops);
  else
    raise notice 'public.profiles לא קיימת - מדלגים על האינדקס שלה. להריץ supabase-profiles.sql ואז את הקובץ הזה שוב.';
  end if;
end
$$;

-- ---------- Verification ----------
-- `explain select ... from ai_spend where route='chat' order by at desc limit 1;`
-- should show "Index Scan" on ai_spend_route_at_idx and not "Seq Scan".
-- Same for purchases with `order by created_at desc limit 20;`
-- and for profiles with `where display_name ilike '%x%';` (any partial name,
-- e.g. a single Hebrew letter).
