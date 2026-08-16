-- ============================================================
--  טיול+ · סיפור הטיול (פיצ׳ר פרימיום)
--  להריץ ב-Supabase → SQL Editor. בטוח להריץ פעמיים.
-- ============================================================
--
--  הטיול הופך אחרי הנסיעה לעמוד סיפור ציבורי: המסלול על מפה, הימים,
--  ותמונות שהמטיילים העלו על המקומות שביקרו. היצירה דורשת פרימיום
--  (נאכף בשרת, לא כאן); הצפייה חופשית לכל מי שקיבל קישור - זה מנוע
--  הצמיחה של הפיצ׳ר.
--
--  **snapshot, לא הפניה**: שורת הסיפור נושאת עותק של נתוני הטיול
--  (שם, ימים, עצירות) כפי שהיו ברגע הפרסום. עמוד ציבורי שקורא את
--  הטיול החי של המשתמש היה חושף כל עריכה עתידית שלו לעולם - וגם
--  נשבר כשהטיול נמחק.

create table if not exists public.trip_stories (
  slug        text primary key,             -- קצר, אקראי, בקישור הציבורי
  user_id     uuid not null,
  trip_id     text not null,
  title       text not null,
  -- snapshot של הטיול לרינדור הציבורי: { name, days: [{cityName, citySlug, stops:[{name,...}]}], startDate?, endDate? }
  trip_data   jsonb not null,
  -- תמונות: [{ path, dayNumber?, caption? }] - path בתוך דלי story-photos
  photos      jsonb not null default '[]'::jsonb,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, trip_id)                 -- סיפור אחד לטיול
);

alter table public.trip_stories enable row level security;
-- כל הכתיבה עוברת בשרת עם service role (אכיפת פרימיום + ולידציה).
-- קריאה ציבורית של סיפור שפורסם - דרך הפונקציה למטה, לא ישירות.
revoke all on table public.trip_stories from anon, authenticated;

-- קריאה ציבורית: רק סיפור שפורסם, רק השדות שהעמוד צריך. פונקציה ולא
-- policy כדי ששדות בעלות (user_id, trip_id) לא ייחשפו לציבור לעולם.
create or replace function public.get_trip_story(p_slug text)
returns table (title text, trip_data jsonb, photos jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select s.title, s.trip_data, s.photos, s.created_at
  from public.trip_stories s
  where s.slug = p_slug and s.published = true;
$$;

grant execute on function public.get_trip_story(text) to anon, authenticated;

-- ---------- דלי התמונות ----------
--  יצירת הדלי עצמה נעשית פעם אחת כאן; ההעלאה עוברת בשרת (service
--  role) אחרי ולידציה, ולכן אין policy כתיבה לציבור. קריאה ציבורית
--  לתמונות של סיפורים שפורסמו - הדלי public לקריאה.
insert into storage.buckets (id, name, public)
values ('story-photos', 'story-photos', true)
on conflict (id) do nothing;
