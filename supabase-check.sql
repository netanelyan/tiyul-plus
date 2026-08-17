-- ============================================================
-- supabase-check.sql - "did I run all the SQL files?"
--
-- READ-ONLY. Creates nothing, changes nothing. Paste the whole
-- file into the Supabase SQL Editor and press Run.
--
-- It asks the catalog what actually exists, so it works no
-- matter which files have or have not been run - it can never
-- error with "column does not exist".
--
-- Read the STATUS column:
--   OK      - every object that file creates is present
--   MISSING - run that file
-- ============================================================

with expected(file, kind, obj) as (
  values
    -- supabase-setup.sql (short share links)
    ('supabase-setup.sql',     'table',  'public.shared_trips'),

    -- supabase-accounts.sql (cross-device trip sync)
    ('supabase-accounts.sql',  'table',  'public.user_trips'),

    -- supabase-profiles.sql (the user hub: name, avatar, passport)
    ('supabase-profiles.sql',  'table',  'public.profiles'),

    -- supabase-premium.sql (plans + AI usage budget)
    ('supabase-premium.sql',   'table',  'public.usage_daily'),
    ('supabase-premium.sql',   'func',   'public.bump_usage'),
    ('supabase-premium.sql',   'column', 'public.profiles.plan'),
    ('supabase-premium.sql',   'column', 'public.profiles.stripe_customer_id'),

    -- supabase-community.sql (traveler search, public profiles)
    ('supabase-community.sql', 'view',   'public.public_profiles'),
    ('supabase-community.sql', 'func',   'public.find_traveler_by_email'),
    ('supabase-community.sql', 'column', 'public.profiles.is_public'),

    -- supabase-admin.sql (owner/admin roles, promo codes, flags)
    ('supabase-admin.sql',     'table',  'public.admin_audit'),
    ('supabase-admin.sql',     'table',  'public.promo_codes'),
    ('supabase-admin.sql',     'table',  'public.promo_redemptions'),
    ('supabase-admin.sql',     'table',  'public.app_flags'),
    ('supabase-admin.sql',     'func',   'public.redeem_promo'),
    ('supabase-admin.sql',     'column', 'public.profiles.role'),
    ('supabase-admin.sql',     'column', 'public.profiles.plan_until'),
    ('supabase-admin.sql',     'column', 'public.profiles.plan_source'),

    -- supabase-catalog.sql (the catalog in the database)
    ('supabase-catalog.sql',   'table',  'public.catalog_countries'),
    ('supabase-catalog.sql',   'table',  'public.catalog_destinations'),
    ('supabase-catalog.sql',   'table',  'public.catalog_places'),

    -- supabase-ai-spend.sql (daily AI spend ceiling + history)
    ('supabase-ai-spend.sql',  'table',  'public.ai_spend'),
    ('supabase-ai-spend.sql',  'table',  'public.ai_spend_daily'),
    ('supabase-ai-spend.sql',  'table',  'public.ai_spend_caller'),
    ('supabase-ai-spend.sql',  'func',   'public.bump_ai_spend'),
    ('supabase-ai-spend.sql',  'func',   'public.claim_ai_spend_alert'),

    -- supabase-admin-dash.sql (owner dashboard: export counter + indexes)
    ('supabase-admin-dash.sql','table',  'public.app_events'),
    ('supabase-admin-dash.sql','func',   'public.bump_event'),
    -- The function existing is not enough: the closed list in its body was extended
    -- (the growth events, 2026-08-13). An old version swallows them silently - zeros
    -- that look like a quiet week. fnbody checks that the body contains the new kind.
    ('supabase-admin-dash.sql','fnbody', 'public.bump_event:trip_created'),

    -- supabase-paypal-subs.sql (premium subscription via PayPal)
    ('supabase-paypal-subs.sql','column', 'public.profiles.paypal_subscription_id'),

    -- supabase-stories.sql was retired on 2026-08-17 together with the trip-story
    -- feature, so it is no longer checked. The trip_stories table and the
    -- story-photos bucket may still exist in a project where it was run; they are
    -- harmless and are left alone rather than dropped from here - a check file
    -- must not delete anybody's data. See supabase-retire-stories.sql to remove them.

    -- supabase-group-trips.sql (shared trips - premium organizer)
    ('supabase-group-trips.sql','table', 'public.trip_group_invites'),
    ('supabase-group-trips.sql','table', 'public.trip_group_members'),
    ('supabase-group-trips.sql','table', 'public.trip_group_votes'),

    -- supabase-newsletter.sql (mailing list signups)
    ('supabase-newsletter.sql','table',  'public.newsletter_signups'),

    -- supabase-purchases.sql (pre-departure check purchases via PayPal)
    ('supabase-purchases.sql', 'table',  'public.purchases'),

    -- supabase-premium-budget.sql (per-subscriber monthly AI wallet)
    ('supabase-premium-budget.sql', 'table', 'public.subscriber_spend_monthly'),
    ('supabase-premium-budget.sql', 'func',  'public.bump_subscriber_spend'),

    -- supabase-perf-indexes.sql (indexes for queries that already run)
    ('supabase-perf-indexes.sql', 'index', 'public.ai_spend_route_at_idx'),
    ('supabase-perf-indexes.sql', 'index', 'public.purchases_created_idx'),
    ('supabase-perf-indexes.sql', 'index', 'public.profiles_display_name_trgm_idx')
),
checked as (
  select
    e.file,
    e.kind,
    e.obj,
    case e.kind
      when 'table'  then to_regclass(e.obj) is not null
      when 'view'   then to_regclass(e.obj) is not null
      -- An index is a relation exactly like a table - the same check works
      when 'index'  then to_regclass(e.obj) is not null
      -- 'schema.func:needle' - the function exists *and* its body contains the
      -- string. That is how an old version of the file still running is detected.
      when 'fnbody' then exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = split_part(e.obj, '.', 1)
          and p.proname = split_part(split_part(e.obj, '.', 2), ':', 1)
          and p.prosrc like '%' || split_part(e.obj, ':', 2) || '%'
      )
      when 'func'   then exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = split_part(e.obj, '.', 1)
          and p.proname = split_part(e.obj, '.', 2)
      )
      when 'column' then exists (
        select 1 from information_schema.columns c
        where c.table_schema = split_part(e.obj, '.', 1)
          and c.table_name   = split_part(e.obj, '.', 2)
          and c.column_name  = split_part(e.obj, '.', 3)
      )
    end as present
  from expected e
)
select
  file,
  case when bool_and(present) then 'OK' else 'MISSING - run this file' end as status,
  count(*) filter (where present)     as found,
  count(*)                            as expected,
  coalesce(string_agg(obj, ', ') filter (where not present), '-') as what_is_missing
from checked
group by file
order by status desc, file;
