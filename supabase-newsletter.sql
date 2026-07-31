-- ============================================================
--  רשימת הדיוור של טיול+
--  להריץ ב-Supabase → SQL Editor. אידמפוטנטי, אפשר להריץ שוב.
-- ============================================================
--
--  איפה נשמרות הכתובות: בטבלה `newsletter_signups` בפרויקט ה-Supabase
--  שכבר משמש את החשבונות ואת קישורי השיתוף. אין ספק חיצוני ואין תלות
--  חדשה - זה אותו מסד נתונים.
--
--  **הטבלה סגורה לחלוטין לציבור.** אין policy ל-anon ואין ל-authenticated,
--  כלומר אי אפשר לקרוא ממנה ואי אפשר לכתוב אליה מהדפדפן. ההרשמה עוברת
--  דרך `/api/newsletter` בשרת, עם מפתח ה-service role - כך שאף אחד לא
--  יכול לשלוף את רשימת הכתובות דרך ה-API הציבורי, וזה העיקר בטבלה
--  שמחזיקה כתובות אימייל של אנשים.

create table if not exists public.newsletter_signups (
  email       text primary key,
  created_at  timestamptz not null default now(),
  -- מאיפה נרשמו (footer / עמוד נחיתה עתידי), לצורך הבנה בלבד
  source      text,
  -- ביטול הרשמה בלי למחוק את השורה, כדי שלא נשלח שוב בטעות
  unsubscribed_at timestamptz
);

alter table public.newsletter_signups enable row level security;

-- אין policies בכוונה: RLS פעיל בלי policy = אף אחד חוץ מה-service role
-- לא רואה ולא כותב. אם מישהו מוסיף כאן policy ל-anon, הוא פותח את רשימת
-- הכתובות לעולם - לא לעשות את זה.
revoke all on public.newsletter_signups from anon, authenticated;

create index if not exists newsletter_signups_created_at_idx
  on public.newsletter_signups (created_at desc);
