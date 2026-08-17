-- tiyul+ · RLS audit · read-only
--
-- Run in the SQL Editor. The file **changes nothing** - it only asks the
-- Postgres catalog. It can be run before the fix to see the exposure, and
-- after it to see that it was closed.
--
-- Query 1 is the direct answer to "what was exposed": it lists every table
-- anon has a privilege on, and shows next to each policy its condition. A
-- policy whose condition is `true` is exactly "all rows".

-- ============================================================
-- 1. What anon can do, table by table
-- ============================================================
select
  t.table_name                                        as "טבלה",
  string_agg(distinct t.privilege_type, ', '
             order by t.privilege_type)               as "הרשאות ל-anon",
  coalesce(
    (select string_agg(
       p.policyname || ' [' || p.cmd || '] using=' ||
       coalesce(p.qual, '-') || ' check=' || coalesce(p.with_check, '-'),
       E'\n')
     from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = t.table_name
       and 'anon' = any(p.roles)),
    '(אין מדיניות ל-anon)')                            as "מדיניות"
from information_schema.table_privileges t
where t.grantee = 'anon'
  and t.table_schema = 'public'
group by t.table_name
order by t.table_name;

-- Expectation after the fix:
--   shared_trips  - does not appear at all.
--   The catalog tables (countries / destinations / places) - SELECT only,
--                   and deliberately: this is public content the site serves
--                   to every visitor.
--   public_profiles - does not appear.

-- ============================================================
-- 2. shared_trips - closed?
-- ============================================================
-- `to_regclass` and not `::regclass`: the cast **throws an error** on a table
-- that does not exist and kills the rest of the file, and a diagnostic file
-- that falls over on the exact state it came to diagnose is a wasted round
-- trip. Same lesson as in supabase-check.sql.
select
  case
    when to_regclass('public.shared_trips') is null
      then 'PROBLEM · הטבלה לא קיימת - להריץ supabase-setup.sql'
    when (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'shared_trips') > 0
      then 'PROBLEM · עדיין יש מדיניות על shared_trips'
    when exists (select 1 from information_schema.table_privileges
                 where table_schema = 'public' and table_name = 'shared_trips'
                   and grantee in ('anon', 'authenticated'))
      then 'PROBLEM · עדיין יש הרשאה ישירה ל-anon/authenticated'
    when not (select relrowsecurity from pg_class
              where oid = to_regclass('public.shared_trips'))
      then 'PROBLEM · RLS כבויה'
    else 'OK · אין מדיניות, אין הרשאה, RLS דלוקה'
  end as "shared_trips";

-- ============================================================
-- 3. The read function exists and is restricted to the code
-- ============================================================
select
  case
    when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname = 'public' and p.proname = 'get_shared_trip')
      then 'PROBLEM · get_shared_trip לא קיימת'
    when not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'get_shared_trip')
      then 'PROBLEM · הפונקציה אינה security definer'
    when (select array_to_string(p.proconfig, ',') from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'get_shared_trip')
         is distinct from 'search_path=public'
      then 'PROBLEM · חסר set search_path = public'
    else 'OK · security definer + search_path נעול'
  end as "get_shared_trip";

-- **The hostile-input test itself lives in supabase-rls-fix.sql and not
-- here**, and not for ordering reasons: Postgres resolves a function name at
-- parse time, so a line that calls get_shared_trip fails with "function does
-- not exist" before the fix - i.e. exactly when this file is run to see what
-- is broken. There, after the creation, the function definitely exists and
-- the failure is exactly what you want from a migration. Only structural
-- checks that cannot fall over remain here.
--
-- Who is allowed to execute it:
select
  coalesce(
    (select string_agg(g, ', ' order by g)
     from unnest(array['anon', 'authenticated', 'service_role', 'public']) g
     where to_regprocedure('public.get_shared_trip(text)') is not null
       and has_function_privilege(g, to_regprocedure('public.get_shared_trip(text)'), 'execute')),
    '(הפונקציה לא קיימת)')
  as "מי יכול להריץ את get_shared_trip";
-- Expectation: anon, authenticated, service_role. `public` in this list is
-- not a disaster (it is derived from the three) but signals that the initial
-- revoke did not run.

-- ============================================================
-- 4. public_profiles - what exactly it exposes, and to whom
-- ============================================================
select
  c.column_name                                       as "עמודה",
  c.data_type                                         as "טיפוס"
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'public_profiles'
order by c.ordinal_position;
-- Expectation: exactly user_id, display_name, avatar, visited. No extra
-- column. **If a new column shows up here - that is an exposure, not an
-- improvement.**

select
  coalesce(string_agg(grantee, ', ' order by grantee), '(אף אחד)')
    as "מי יכול לקרוא את public_profiles"
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'public_profiles'
  and privilege_type = 'SELECT'
  and grantee in ('anon', 'authenticated');
-- Expectation after the fix: authenticated only.

-- ============================================================
-- 5. Every table carrying an unconditional policy
-- ============================================================
-- This is the check that would have caught the original bug. A `qual` or
-- `with_check` that is the literal `true` means "all rows", no matter what
-- the policy is named.
select
  tablename                                           as "טבלה",
  policyname                                          as "מדיניות",
  cmd                                                 as "פעולה",
  array_to_string(roles, ', ')                        as "תפקידים",
  coalesce(qual, '-')                                 as "using",
  coalesce(with_check, '-')                           as "with check"
from pg_policies
where schemaname = 'public'
  and (qual = 'true' or with_check = 'true')
  and (roles && array['anon', 'authenticated', 'public']::name[])
order by tablename, policyname;
-- Expectation: only the catalog tables, and only for SELECT. Any row here
-- that is not SELECT, or not catalog, is a finding.
