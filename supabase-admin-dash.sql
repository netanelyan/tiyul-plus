-- ============================================================
--  טיול+ · לוח הבקרה של הבעלים
--  להריץ ב-Supabase → SQL Editor. בטוח להריץ פעמיים.
-- ============================================================
--
--  הלוח עצמו עובד גם בלי הקובץ הזה - הוא קורא טבלאות שכבר קיימות
--  (user_trips, shared_trips, profiles, ai_spend). מה שהקובץ מוסיף:
--
--  1. מונה אירועים אגרגטיבי, כדי לענות על "כמה טיולים מיוצאים".
--  2. אינדקסים שהופכים את הלוח למהיר כשיהיו הרבה שורות.
--
--  יומן הגישה של האדמין יושב ב-`admin_audit` מ-supabase-admin.sql
--  ולא נדרש כאן שום דבר נוסף.
-- ============================================================

-- ---------- 1. מונה אירועים ----------
--  **אגרגטיבי בכוונה, ולא יומן התנהגות.** אין כאן user_id, אין
--  trip_id ואין חותמת זמן מדויקת - רק "ביום הזה היו N הדפסות". זו
--  התשובה לשאלה של נתנאל בלי ליצור מעקב אחרי אנשים.
create table if not exists public.app_events (
  day   date not null,
  kind  text not null,          -- print | pdf | whatsapp | share | maps
  count integer not null default 0,
  primary key (day, kind)
);

create or replace function public.bump_event(p_day date, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- רשימה סגורה בתוך הפונקציה: גם אם משהו יקרא לה עם ערך אחר, לא
  -- ייווצר מפתח חדש. הנתיב מאמת ממילא; זו השכבה השנייה.
  if p_kind not in ('print', 'pdf', 'whatsapp', 'share', 'maps') then
    return;
  end if;
  insert into public.app_events (day, kind, count)
  values (p_day, p_kind, 1)
  on conflict (day, kind) do update
    set count = public.app_events.count + 1;
end;
$$;

alter table public.app_events enable row level security;
-- אין policy: RLS דלוק בלי policy = service role בלבד.
revoke all on public.app_events from anon, authenticated;
-- הפונקציה נקראת מהשרת עם service role בלבד
revoke all on function public.bump_event(date, text) from anon, authenticated;

-- ---------- 2. אינדקסים ללוח ----------
create index if not exists user_trips_updated_idx on public.user_trips (updated_at desc);
create index if not exists shared_trips_created_idx on public.shared_trips (created_at desc);
-- הוסר 2026-08-13: השורה שהייתה כאן ניסתה
-- `create index ... on public.admin_audit (at desc)`, ועמודה כזו
-- לא קיימת - ל-admin_audit יש created_at (ראו supabase-admin.sql
-- שורה 84), לא at. ההרצה נכשלה על השורה הזו בכל פעם. האינדקס הנכון
-- - `admin_audit_created_idx on public.admin_audit (created_at desc)`
-- - כבר קיים ב-supabase-admin.sql; אין צורך בעוד אחד כאן.
