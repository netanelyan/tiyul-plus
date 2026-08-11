-- טיול+ · ביקורת RLS · לקריאה בלבד
--
-- מריצים ב-SQL Editor. הקובץ **לא משנה כלום** - רק שואל את הקטלוג של
-- Postgres. אפשר להריץ אותו לפני התיקון כדי לראות את החשיפה, ואחריו
-- כדי לראות שהיא נסגרה.
--
-- שאילתה 1 היא התשובה הישירה לשאלה "מה היה חשוף": היא מונה כל טבלה
-- שיש ל-anon הרשאה עליה, ומראה ליד כל מדיניות את התנאי שלה. מדיניות
-- שהתנאי שלה `true` היא בדיוק "כל השורות".

-- ============================================================
-- 1. מה anon יכול לעשות, טבלה-טבלה
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

-- ציפייה אחרי התיקון:
--   shared_trips  - לא מופיעה בכלל.
--   טבלאות הקטלוג (countries / destinations / places) - SELECT בלבד,
--                   ובכוונה: זה תוכן ציבורי שהאתר מגיש לכל מבקר.
--   public_profiles - לא מופיעה.

-- ============================================================
-- 2. shared_trips - סגורה?
-- ============================================================
-- `to_regclass` ולא `::regclass`: הקאסט **זורק שגיאה** על טבלה שאינה
-- קיימת ומפיל את שאר הקובץ, וקובץ אבחון שנופל על המצב שהוא בא לאבחן
-- הוא בזבוז של סיבוב שלם. אותו לקח כמו ב-supabase-check.sql.
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
-- 3. פונקציית הקריאה קיימת ומוגבלת לקוד
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

-- **בדיקת הקלט הזדוני עצמה גרה ב-supabase-rls-fix.sql ולא כאן**, ולא
-- מטעמי סדר: Postgres מפענח שם של פונקציה בזמן פרסור, ולכן שורה
-- שקוראת ל-get_shared_trip נופלת עם "function does not exist" לפני
-- התיקון - כלומר בדיוק כשמריצים את הקובץ הזה כדי לראות מה שבור. שם,
-- אחרי היצירה, הפונקציה קיימת בוודאות והכישלון הוא בדיוק מה שרוצים
-- ממיגרציה. כאן נשארות רק בדיקות מבנה שלא יכולות ליפול.
--
-- מי מורשה להריץ אותה:
select
  coalesce(
    (select string_agg(g, ', ' order by g)
     from unnest(array['anon', 'authenticated', 'service_role', 'public']) g
     where to_regprocedure('public.get_shared_trip(text)') is not null
       and has_function_privilege(g, to_regprocedure('public.get_shared_trip(text)'), 'execute')),
    '(הפונקציה לא קיימת)')
  as "מי יכול להריץ את get_shared_trip";
-- ציפייה: anon, authenticated, service_role. `public` ברשימה הזאת
-- אינו אסון (הוא נגזר מהשלושה) אבל מסמן שה-revoke הראשוני לא רץ.

-- ============================================================
-- 4. public_profiles - מה בדיוק הוא חושף, ולמי
-- ============================================================
select
  c.column_name                                       as "עמודה",
  c.data_type                                         as "טיפוס"
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'public_profiles'
order by c.ordinal_position;
-- ציפייה: בדיוק user_id, display_name, avatar, visited. שום עמודה
-- נוספת. **אם צצה כאן עמודה חדשה - זו חשיפה, לא שיפור.**

select
  coalesce(string_agg(grantee, ', ' order by grantee), '(אף אחד)')
    as "מי יכול לקרוא את public_profiles"
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'public_profiles'
  and privilege_type = 'SELECT'
  and grantee in ('anon', 'authenticated');
-- ציפייה אחרי התיקון: authenticated בלבד.

-- ============================================================
-- 5. כל טבלה שיש עליה מדיניות ללא תנאי
-- ============================================================
-- זו הבדיקה שהייתה תופסת את הבאג המקורי. `qual` או `with_check` שהם
-- ליטרל `true` פירושם "כל השורות", ולא משנה איך המדיניות נקראת.
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
-- ציפייה: רק טבלאות הקטלוג, ורק ב-SELECT. כל שורה כאן שאינה SELECT,
-- או שאינה קטלוג, היא ממצא.
