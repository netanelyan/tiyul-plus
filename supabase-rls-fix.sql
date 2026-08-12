-- טיול+ · סגירת חשיפה ב-RLS · 2026-08-11
--
-- ############################################################
-- להריץ פעם אחת ב-SQL Editor. אידמפוטנטי - בטוח להריץ שוב.
-- ############################################################
--
-- ## מה היה פתוח
--
-- `shared_trips` נשאה שתי מדיניות ל-anon, ושתיהן ללא תנאי:
--
--     create policy "anyone can read a share link by code"
--       on public.shared_trips for select to anon using (true);
--
-- **השם מתאר כוונה שהתנאי לא מבטא.** `using (true)` אינו "לפי קוד" -
-- הוא "כל שורה". כלומר כל מי שמחזיק את מפתח ה-anon, שנשלח בכל דף
-- שאנחנו מגישים, יכול היה למשוך את *כל* קישורי השיתוף באתר בבקשה אחת,
-- ולא רק לפתוח קוד מסוים.
--
-- וה-insert היה גם הוא `with check (true)`, כלומר כתיבה ללא הגבלה
-- ישירות מהדפדפן - שעוקפת את המכסות שב-`/api/share`.
--
-- ## למה מדיניות לבדה לא יכולה לתקן את זה
--
-- "צריך לדעת את הקוד" אינו תנאי שאפשר לנסח ב-RLS. מדיניות מקבלת את
-- השורה, לא את השאילתה, ולכן היא לא יכולה לדרוש שהקורא ציין `code`.
-- כל ניסוח שמאפשר קריאה של שורה אחת מאפשר קריאה של כולן.
--
-- לכן: **המדיניות מוסרת לגמרי**, ו"לדעת את הקוד" נאכף במקום היחיד
-- שיכול לאכוף אותו - פונקציה שמקבלת קוד ומחזירה שורה אחת.
--
-- ## מה נשאר אפשרי אחרי הקובץ הזה
--
--   קריאה  - רק דרך `public.get_shared_trip(code)`, שמחזירה payload
--            אחד ותו לא. אין לה גרסה שמחזירה רשימה.
--   כתיבה  - רק דרך השרת שלנו עם ה-service role, כלומר תמיד מאחורי
--            המכסות של `/api/share`.
--
-- דורש: SUPABASE_SERVICE_ROLE_KEY ב-Vercel. בלעדיו יצירת קישור קצר
-- כבויה בשקט והלקוח נופל לקישור הארוך, שממשיך לעבוד במלואו.

-- ---------- 1. הסרת שתי המדיניות ----------

drop policy if exists "anyone can read a share link by code" on public.shared_trips;
drop policy if exists "anyone can create share links" on public.shared_trips;

-- RLS נשארת דלוקה **וללא אף מדיניות**: זה מצב "אף אחד", לא מצב "כולם".
-- service_role עוקף RLS בהגדרה ולכן השרת שלנו ממשיך לעבוד.
alter table public.shared_trips enable row level security;

-- ---------- 2. שלילת ההרשאה עצמה, לא רק המדיניות ----------

-- RLS מסננת שורות; GRANT מחליט אם בכלל מותר לגעת בטבלה. שלילת ההרשאה
-- היא השכבה שממשיכה להגן גם אם מישהו יוסיף מדיניות רחבה בעתיד.
revoke all on public.shared_trips from anon, authenticated;

-- ההרשאה של השרת נאמרת במפורש ולא נשענת על default privileges. היא
-- קיימת ממילא ב-Supabase, אבל "השרת עדיין עובד" הוא בדיוק הדבר שאסור
-- שיהיה תלוי בהנחה - הבדיקה המקומית של הקובץ הזה נכשלה עליו.
grant select, insert on public.shared_trips to service_role;

-- ---------- 3. קריאה לפי קוד, ורק לפי קוד ----------

create or replace function public.get_shared_trip(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select payload
  from public.shared_trips
  -- אותה צורת קוד שהשרת מייצר. קלט שאינו בצורה הזאת לא מגיע לטבלה
  -- בכלל, כך שאין דרך לנסח כאן דפוס שמחזיר יותר משורה אחת.
  where p_code ~ '^[a-zA-Z0-9]{6,12}$'
    and code = p_code
  limit 1;
$$;

-- `public` כולל כל תפקיד עתידי. ברירת המחדל של Postgres נותנת execute
-- ל-public, ולכן השלילה הזאת חייבת לבוא לפני ההענקה המפורשת.
revoke all on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_trip(text) to anon, authenticated, service_role;

-- ---------- 3b. בדיקה עצמית, כאן ולא בקובץ הביקורת ----------
--
-- Postgres מפענח שם של פונקציה בזמן פרסור, ולכן שורה שקוראת ל-
-- get_shared_trip נופלת עם "function does not exist" אם היא רצה לפני
-- שהפונקציה נוצרה. המקום היחיד שבו הקריאה בטוחה הוא כאן, מיד אחרי
-- היצירה - ומיגרציה שנופלת על בדיקה עצמית היא בדיוק ההתנהגות הרצויה.
do $$
begin
  if public.get_shared_trip('') is not null
     or public.get_shared_trip('%') is not null      -- תו כללי של LIKE
     or public.get_shared_trip('_') is not null      -- תו כללי בן-תו
     or public.get_shared_trip('.*') is not null     -- דפוס regex
     or public.get_shared_trip(repeat('a', 13)) is not null
  then
    raise exception 'get_shared_trip החזירה תוצאה לקלט שאינו קוד';
  end if;
end
$$;

-- ---------- 4. public_profiles: להסיר גישה אנונימית ----------
--
-- ה-view נוצר בלי `security_invoker`, ולכן הוא עוקף RLS. זה **לא** הבאג
-- וגם לא מה שצריך לשנות: `security_invoker = true` היה מכפיף אותו ל-RLS
-- של `profiles`, שהיא שורה-של-עצמך בלבד, ומשבית את חיפוש המטיילים כליל.
--
-- מה שהוא כן חושף: `user_id`, `display_name`, `avatar`, `visited` של כל
-- מי ש-`is_public = true`. לא מייל, לא טלפון, לא טיולים. הבעיה היא שעם
-- `grant ... to anon` אפשר למשוך את **כל** הרשימה בבקשה אחת - ספרייה
-- של שמות ותצלומים לגריפה. חיפוש מטיילים ממילא חי מאחורי התחברות.
revoke select on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------- 5. אימות ----------
-- להריץ אחרי זה את `scripts/rls-audit.sql`. הוא לקריאה בלבד ומדפיס
-- שורת OK / PROBLEM אחת לכל בדיקה.
