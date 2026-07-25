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

-- חיפוש לפי מייל: התאמה מדויקת בלבד (בלי חיפוש חלקי - שלא ניתן יהיה
-- לסרוק כתובות), רק למחוברים, רק פרופילים ציבוריים, והמייל עצמו לא
-- מוחזר לעולם. SECURITY DEFINER כי המיילים חיים ב-auth.users.
create or replace function public.find_traveler_by_email(p_email text)
returns table (user_id uuid, display_name text, avatar text, visited jsonb)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.display_name, p.avatar, p.visited
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = lower(trim(p_email))
    and p.is_public = true
    and p.display_name is not null
    and length(trim(p.display_name)) > 0
$$;

revoke all on function public.find_traveler_by_email(text) from public;
grant execute on function public.find_traveler_by_email(text) to authenticated;
