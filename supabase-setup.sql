-- טיול+ · הקמת אחסון קישורי שיתוף קצרים (Supabase)
-- להריץ פעם אחת ב-SQL Editor של פרויקט ה-Supabase, ואז להגדיר
-- SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
-- ב-.env.local / Vercel (ראו .env.example).
--
-- ## הערה שנכתבה אחרי באג אמיתי (2026-08-11)
--
-- הגרסה הראשונה של הקובץ הזה נשאה שתי מדיניות ל-anon ללא תנאי, אחת
-- מהן בשם "anyone can read a share link by code" עם `using (true)` -
-- כלומר **כל** שורה, לא שורה לפי קוד. התוצאה: כל מי שמחזיק את מפתח
-- ה-anon, שנשלח בכל דף שאנחנו מגישים, יכול היה למשוך את כל קישורי
-- השיתוף באתר.
--
-- הלקח, והוא הסיבה שהקובץ הזה נראה עכשיו כך: **"צריך לדעת את הקוד"
-- אינו תנאי שאפשר לנסח ב-RLS.** מדיניות מקבלת שורה, לא שאילתה, ולכן
-- אין לה דרך לדרוש שהקורא ציין `code`. כל ניסוח שמתיר שורה אחת מתיר
-- את כולן. לכן הקריאה עוברת בפונקציה שמקבלת קוד, והכתיבה בשרת שלנו.
--
-- פרויקט קיים שכבר הריץ את הגרסה הישנה: להריץ `supabase-rls-fix.sql`.
-- אימות בשני המקרים: `scripts/rls-audit.sql` (לקריאה בלבד).

create table if not exists public.shared_trips (
  code text primary key,
  payload text not null,           -- ה-payload המקודד של הקישור (v1 base64url)
  created_at timestamptz not null default now()
);

-- RLS דלוקה **וללא אף מדיניות**. זה מצב "אף אחד", לא מצב "כולם":
-- service_role עוקף RLS בהגדרה, ולכן השרת שלנו עובד וכל השאר לא.
alter table public.shared_trips enable row level security;

drop policy if exists "anyone can read a share link by code" on public.shared_trips;
drop policy if exists "anyone can create share links" on public.shared_trips;

-- RLS מסננת שורות; GRANT מחליט אם בכלל מותר לגעת בטבלה. השלילה היא
-- השכבה שממשיכה להגן גם אם מישהו יוסיף מדיניות רחבה בעתיד.
revoke all on public.shared_trips from anon, authenticated;

-- ההרשאה של השרת נאמרת במפורש ולא נשענת על default privileges.
grant select, insert on public.shared_trips to service_role;

-- ---------- קריאה: לפי קוד, ורק לפי קוד ----------
create or replace function public.get_shared_trip(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select payload
  from public.shared_trips
  where p_code ~ '^[a-zA-Z0-9]{6,12}$'
    and code = p_code
  limit 1;
$$;

-- ברירת המחדל של Postgres נותנת execute ל-public (כלומר לכל תפקיד,
-- כולל כאלה שייווצרו בעתיד), ולכן השלילה חייבת לקדום להענקה.
revoke all on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_trip(text) to anon, authenticated, service_role;

-- ---------- כתיבה ----------
-- אין מדיניות insert, בכוונה. יצירת קישור עוברת ב-/api/share עם
-- ה-service role, כלומר תמיד מאחורי המכסות. anon insert ללא תנאי היה
-- מאפשר למלא את הטבלה מהדפדפן בלי שום שער.

-- בעתיד (חשבונות): alter table add column user_id uuid references auth.users,
-- ומדיניות שמותירה לבעלים לנהל את הקישורים שלו.
