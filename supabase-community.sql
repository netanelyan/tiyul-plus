-- טיול+ · שלב 4: קהילת מטיילים - חיפוש משתמשים (פרטיות תחילה)
-- להריץ פעם אחת ב-SQL Editor (אחרי supabase-profiles.sql).
--
-- עיקרון: אף אחד לא ניתן לחיפוש עד שהדליק "פרופיל ציבורי" בהגדרות.
-- גם אז נחשפים רק: שם תצוגה, תמונה ודרכון המדינות - לעולם לא מייל,
-- טלפון או טיולים.

alter table public.profiles
  add column if not exists is_public boolean not null default false;

-- VIEW בהרשאות בעלים (עוקף RLS) שחושף רק את העמודות הבטוחות ורק
-- לפרופילים שבחרו להיות ציבוריים - הדפוס המקובל ב-Supabase לגילוי.
create or replace view public.public_profiles as
  select user_id, display_name, avatar, visited
  from public.profiles
  where is_public = true
    and display_name is not null
    and length(trim(display_name)) > 0;

grant select on public.public_profiles to anon, authenticated;
