-- טיול+ · קטלוג היעדים ב-Supabase (מדינות, יעדים, מקומות)
-- להריץ פעם אחת ב-SQL Editor. בטוח להריץ שוב.
--
-- **היקף:** רק הקטלוג. טיולים, טיולים שמורים וכל מה שהמשתמש יוצר לא
-- נוגעים כאן בכלל ונשארים בדיוק איפה שהם.
--
-- **הארכיטקטורה (החלטת נתנאל, 2026-07-27):** Supabase הוא מקור האמת
-- לעריכה, אבל האתר ממשיך לקרוא מ-`src/data/*.ts`. סקריפט מייצר את
-- הקבצים מהדאטהבייס. הסיבה: עמודי היעדים והמדינות נוצרים סטטית
-- (generateStaticParams, 147 נתיבים), כך שהיום עלות הקריאה בזמן ריצה
-- היא אפס. קריאה מ-Supabase בזמן ריצה הייתה מוסיפה סיבוב רשת במקום
-- שאין בו אחד, כלומר מאיטה ולא מזרזת. עוד סיבה: חמישה רכיבי
-- 'use client' מייבאים את הקטלוג סינכרונית ברמת המודול, ומעבר לקריאה
-- אסינכרונית היה מחייב שינוי במסך הטיול - וזה נפסל במפורש.
--
-- **הצורה של הטבלאות מכוונת לשקף אחד-לאחד את `src/lib/types.ts`.**
-- שדות שהם אובייקטים או מערכים במבנה TypeScript נשמרים כ-jsonb ולא
-- מפוצלים לטבלאות נפרדות, כדי שהמעבר יהיה העתקה טהורה בלי שיקול דעת.
-- `position` שומר את סדר המקורי, כי הסדר בקטלוג הוא תוכן עריכתי.

-- ---------- מדינות ----------
create table if not exists public.catalog_countries (
  slug        text primary key,
  position    integer not null,
  name        text not null,
  name_local  text not null,
  flag        text not null,
  tagline     text not null,
  summary     text not null,
  photo       text,
  practical   jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- יעדים ----------
create table if not exists public.catalog_destinations (
  slug             text primary key,
  position         integer not null,
  name             text not null,
  name_local       text not null,
  country_slug     text not null references public.catalog_countries(slug) on delete restrict,
  flag             text not null,
  center           jsonb not null,
  zoom             integer not null,
  tagline          text not null,
  summary          text not null,
  best_season      text not null,
  photo            text,
  iconic_landmark  jsonb,
  editorial_rating jsonb,
  itinerary        jsonb not null,
  practical        jsonb not null,
  updated_at       timestamptz not null default now()
);

create index if not exists catalog_destinations_country_idx
  on public.catalog_destinations (country_slug);

-- ---------- מקומות ----------
-- מפתח ראשי מורכב: מזהי מקומות ייחודיים בכל הקטלוג היום, אבל הצמדה
-- ליעד מונעת התנגשות עתידית ומשקפת את המבנה המקונן במקור.
create table if not exists public.catalog_places (
  destination_slug    text not null references public.catalog_destinations(slug) on delete cascade,
  id                  text not null,
  position            integer not null,
  name                text not null,
  name_local          text not null,
  category            text not null,
  lat                 double precision not null,
  lng                 double precision not null,
  description         text not null,
  rating              double precision,
  duration_min        integer,
  kosher_note         text,
  kosher_verification jsonb,
  external_url        text,
  photo               text,
  price_level         integer,
  tags                jsonb,
  must_see            boolean,
  updated_at          timestamptz not null default now(),
  primary key (destination_slug, id)
);

create index if not exists catalog_places_destination_idx
  on public.catalog_places (destination_slug);

-- ---------- RLS: קריאה בלבד לציבור ----------
-- הקטלוג הוא תוכן עריכתי. הדפדפן צריך לקרוא אותו ולעולם לא לכתוב.
-- הכתיבה נעשית אך ורק דרך סקריפט ההעלאה עם service role key, שעוקף
-- RLS בהגדרה ולכן לא צריך ולא מקבל policy כאן.
alter table public.catalog_countries    enable row level security;
alter table public.catalog_destinations enable row level security;
alter table public.catalog_places       enable row level security;

drop policy if exists catalog_countries_read    on public.catalog_countries;
drop policy if exists catalog_destinations_read on public.catalog_destinations;
drop policy if exists catalog_places_read       on public.catalog_places;

create policy catalog_countries_read
  on public.catalog_countries for select to anon, authenticated using (true);
create policy catalog_destinations_read
  on public.catalog_destinations for select to anon, authenticated using (true);
create policy catalog_places_read
  on public.catalog_places for select to anon, authenticated using (true);

-- אין policy ל-insert/update/delete, ולכן הן חסומות לחלוטין ל-anon
-- ול-authenticated. זו לא השמטה - זו הנקודה.
revoke insert, update, delete on public.catalog_countries    from anon, authenticated;
revoke insert, update, delete on public.catalog_destinations from anon, authenticated;
revoke insert, update, delete on public.catalog_places       from anon, authenticated;

grant select on public.catalog_countries    to anon, authenticated;
grant select on public.catalog_destinations to anon, authenticated;
grant select on public.catalog_places       to anon, authenticated;
