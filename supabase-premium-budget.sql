-- טיול+ · תקציב אישי לכל מנוי פרימיום, מבודד לגמרי מהתקציב היומי
-- להריץ פעם אחת ב-Supabase → SQL Editor. אידמפוטנטי - בטוח להריץ שוב.
--
-- ============================================================
-- הרקע: הכלכלה של פרימיום הייתה שגויה
-- ============================================================
--
-- ₪19.90 לחודש (PREMIUM_PRICE_ILS) כולל מע"מ הם כ-₪16.90 נטו, וכ-₪15
-- אחרי עמלות סליקה - בערך $4 לחודש. עלות מדודה: $0.063 לתור ממטמון,
-- $0.45 לתור קר, כ-$0.53 לבניית טיול מלאה. במרווח רווח אפס, $4 קונים
-- כ-60 תורים או כ-7 טיולים - וזו התקרה העליונה המוחלטת, לא תקציב סביר.
-- הכרטיס באתר הבטיח 400 שיחות ו-100 בניות **ביום** - מנוי שהיה מנצל
-- שבריר מזה היה עולה הרבה יותר ממה שהוא משלם.
--
-- ============================================================
-- הפתרון: תקרת דולרים חודשית אמיתית, לכל מנוי בנפרד
-- ============================================================
--
-- $2.00 לחודש למנוי (SUBSCRIBER_MONTHLY_CAP_USD ב-lib/server/budget.ts) -
-- 50% מההכנסה נטו. גם אם מנוי ממצה את זה במלואו, נשאר רווח גולמי של
-- 50% על אותו מנוי בודד; רוב המנויים לא יתקרבו לזה, כך שהרווח הממוצע
-- על פני כל בסיס המנויים גבוה בהרבה. $2.00 קונים בנוחות שני טיולים
-- מלאים (2 × $0.53) ועוד כ-15 תורי עריכה/שאלה ממטמון (15 × $0.063) -
-- בדיוק "נדיב למי שמתכנן טיול אחד-שניים אמיתיים", לא התקרה הישנה.
--
-- ============================================================
-- למה טבלה נפרדת, ולא הרחבה של ai_spend_daily
-- ============================================================
--
-- **שני הארנקים - אנונימי ומחובר-חינמי - אסור שייגעו זה בזה בכל כיוון**,
-- וזה כולל את הארנק החדש של הפרימיום. אילו הוצאת מנוי פרימיום נספרה
-- בתוך ai_spend_daily.usd (כמו שקורה היום לכל "מחובר"), מנוי אחד
-- שמנצל את התקרה שלו היה גורע מהתקציב שהמשתמשים החינמיים חולקים -
-- בדיוק ההפך ממה שהתקרה של האנונימיים כבר נמנעת ממנו. הטבלה כאן
-- **עצמאית לחלוטין**: recordSpend() ב-budget.ts מדלג על bump_ai_spend
-- (שמעדכן ai_spend_daily/ai_spend_caller) עבור מנוי פרימיום, וקורא
-- ל-bump_subscriber_spend במקום. שורת ai_spend הגולמית עדיין נכתבת
-- לכולם, לצורכי דוח - רק הצבירה שמניעה את החסימה מופרדת.
--
-- מפתח חודשי ('YYYY-MM') ולא יומי: זו התקרה שהמנוי באמת חי לפיה -
-- מתאפסת עם המנוי, לא עם חצות.

create table if not exists public.subscriber_spend_monthly (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null,                  -- 'YYYY-MM', לפי UTC כמו dayKey()
  usd        numeric(12, 6) not null default 0,
  requests   integer        not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- לתצוגת "כמה עלו המנויים החודש" באדמין - סכימה לפי חודש, לא לפי משתמש
create index if not exists subscriber_spend_monthly_month_idx
  on public.subscriber_spend_monthly (month, usd desc);

-- ---------- עדכון אטומי, אותו דפוס בדיוק כמו bump_ai_spend ----------
create or replace function public.bump_subscriber_spend(
  p_user  uuid,
  p_month text,
  p_usd   numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
begin
  insert into public.subscriber_spend_monthly (user_id, month, usd, requests)
  values (p_user, p_month, greatest(p_usd, 0), 1)
  on conflict (user_id, month) do update
    set usd        = public.subscriber_spend_monthly.usd + greatest(excluded.usd, 0),
        requests   = public.subscriber_spend_monthly.requests + 1,
        updated_at = now()
  returning usd into total;
  return total;
end;
$$;

-- ---------- הרשאות ----------
-- אותה מדיניות כמו ai_spend*: RLS דלוקה בלי אף policy - "אף אחד", לא
-- "כולם" - ורק ה-service role נכנס. שלילה מפורשת מ-public כדי ש-revoke
-- יקדום להענקה, כמו שסיכם supabase-rpc-grants-fix.sql.
alter table public.subscriber_spend_monthly enable row level security;
revoke all on public.subscriber_spend_monthly from anon, authenticated;

revoke all on function public.bump_subscriber_spend(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.bump_subscriber_spend(uuid, text, numeric) to service_role;

-- ============================================================
-- הפיצ'ר הממשי של פרימיום: בדיקה לפני הנסיעה כלולה בלי הגבלה
-- ============================================================
--
-- "בדיקה לפני הנסיעה" (predeparture.ts) נבנתה במפורש כלא-קשורה ל-
-- Plan/Tier ("אין לזה קשר ל-Plan/Tier ואסור שיהיה"). ההחלטה הזאת
-- הייתה נכונה כשנכתבה - זה מוצר עצמאי בתשלום חד-פעמי - אבל פרימיום
-- לא היה לו שום פיצ'ר איכותי משלו, רק מכסות גדולות יותר על אותו מוצר.
-- ההחלטה כאן היא לתת למנויי פרימיום את הבדיקה **בחינם וללא הגבלה**:
-- זו עלות שולית של אפס (חישוב דטרמיניסטי מול הקטלוג, לא קריאת AI),
-- והיא ההבדל האיכותי הראשון שפרימיום בכלל מציע. ראו purchases.ts
-- ו-checks/create-order/route.ts.
--
-- source חדש: 'premium_included', בנוסף ל-'paypal' ו-'admin_grant'
-- הקיימים. amount=0 כמו admin_grant - זו לא הכנסה אמיתית ואסור
-- שהדוח הפיננסי יספור אותה ככזאת (purchases.ts computeStats מבדיל
-- בין השניים כדי שהתמונה תישאר מדויקת: כמה זה תמיכה אנושית מול כמה
-- זה הטבת מנוי אוטומטית).
--
-- **השם של ה-check constraint המקורי לא מנוחש כאן.** הוא נוצר בלי שם
-- מפורש ב-supabase-purchases.sql, כלומר Postgres בחר שם אוטומטי -
-- לרוב `purchases_source_check`, אבל להסתמך על זה הוא בדיוק סוג
-- ההנחה ש-pgrest.ts קיים כדי למנוע במקום אחר. הבלוק הזה **מוצא** את
-- שם המגבלה בפועל דרך pg_constraint (המגבלה היחידה על עמודת source
-- שהיא CHECK, לא FK/PK) ומוריד אותה לפי השם האמיתי שלה.
--
-- **והקובץ הזה לא תלוי בסדר ההרצה.** ההרצה הראשונה אצל נתנאל נפלה
-- עם `relation "public.purchases" does not exist` - הוא הריץ את הקובץ
-- הזה לפני supabase-purchases.sql. זה בדיוק הלקח שכבר נרשם ביומן על
-- supabase-admin.sql: "הערת 'דרישה מוקדמת' בכותרת לא מנעה את הטעות,
-- ולכן הקובץ הפסיק להיות תלוי בסדר ההרצה." לכן: אם הטבלה עוד לא
-- קיימת - מדלגים בשקט (עם notice), כי supabase-purchases.sql עודכן
-- ליצור את המגבלה **כבר עם** 'premium_included', כך שבכל סדר הרצה
-- התוצאה הסופית זהה. בטוח להריץ שוב אחרי שהטבלה נוצרת.
do $$
declare
  real_name text;
begin
  if to_regclass('public.purchases') is null then
    raise notice 'public.purchases עוד לא קיימת - מדלגים. supabase-purchases.sql יוצר אותה כבר עם premium_included, כך שאין מה להריץ כאן שוב.';
    return;
  end if;

  select con.conname into real_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'purchases'
    and con.contype = 'c'
    and att.attname = 'source'
  limit 1;

  if real_name is not null then
    execute format('alter table public.purchases drop constraint %I', real_name);
  end if;

  alter table public.purchases add constraint purchases_source_check
    check (source in ('paypal', 'admin_grant', 'premium_included'));
end
$$;

-- ---------- אימות ----------
-- `select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.purchases'::regclass and conname = 'purchases_source_check';`
-- אמור להראות את שלושת הערכים.
