-- ============================================================
--  טיול+ · מנוי פרימיום דרך PayPal Subscriptions
--  להריץ ב-Supabase → SQL Editor. בטוח להריץ פעמיים.
-- ============================================================
--
--  מה הקובץ עושה:
--  1. מרחיב את מגבלת ה-CHECK על profiles.plan_source כך שתכלול
--     'paypal' - הערך שה-webhook כותב כשמנוי PayPal מופעל. בלעדיו
--     ההפעלה נכשלת בשקט על המגבלה הישנה ('stripe','grant','promo').
--  2. מוסיף עמודת paypal_subscription_id - לתמיכה בלבד (לאתר את
--     המנוי בדשבורד של PayPal מול משתמש). הזרימה עצמה לא תלויה בה:
--     custom_id על אירועי ה-webhook נושא את זהות המשתמש.
--
--  המגבלה הישנה נוצרה ללא שם מפורש (add column ... check inline),
--  ולכן השם האמיתי מאותר דרך pg_constraint - אותו דפוס בדיוק כמו
--  supabase-premium-budget.sql, מאותה סיבה.

do $$
declare
  real_name text;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'profiles does not exist yet - run supabase-profiles.sql first, then re-run this file';
    return;
  end if;

  select con.conname into real_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'profiles'
    and con.contype = 'c'
    and att.attname = 'plan_source'
  limit 1;

  if real_name is not null then
    execute format('alter table public.profiles drop constraint %I', real_name);
  end if;

  alter table public.profiles
    add constraint profiles_plan_source_check
    check (plan_source is null or plan_source in ('stripe', 'grant', 'promo', 'paypal'));
end $$;

-- עמודת התמיכה. עמודה חדשה אינה נכנסת לרשימת ה-grant הקיימת של
-- authenticated (ההרשאות שם הן פר-עמודה מאז supabase-premium.sql),
-- ולכן היא נכתבת אוטומטית ע"י ה-service role בלבד - אין צורך ב-revoke.
alter table public.profiles
  add column if not exists paypal_subscription_id text;
