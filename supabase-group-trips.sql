-- ============================================================
--  טיול+ · טיול משותף (פיצ׳ר פרימיום למארגן)
--  להריץ ב-Supabase → SQL Editor. בטוח להריץ פעמיים.
-- ============================================================
--
--  המארגן (פרימיום) יוצר קישור הזמנה; חברים מחוברים מצטרפים בחינם,
--  רואים את הטיול חי ומצביעים 👍/👎 על עצירות. המארגן רואה את
--  התוצאות במסך הטיול. הקוד הוא ההרשאה (capability) - מי שמחזיק
--  אותו ומחובר יכול להצטרף; פקיעה אחרי 30 יום מגבילה את חלון החשיפה.
--
--  כל הטבלאות service-role בלבד: RLS דלוק בלי policy, וכל אכיפה
--  (פרימיום, תוקף, חברות) בשרת - אותו מבנה כמו trip_stories.

create table if not exists public.trip_group_invites (
  code        text primary key,
  owner_id    uuid not null,
  trip_id     text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  unique (owner_id, trip_id)          -- קישור פעיל אחד לטיול; יצירה מחדש מחליפה
);

create table if not exists public.trip_group_members (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  joined_at   timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id)
);

create table if not exists public.trip_group_votes (
  owner_id    uuid not null,
  trip_id     text not null,
  member_id   uuid not null,
  place_id    text not null,
  vote        smallint not null check (vote in (-1, 1)),
  updated_at  timestamptz not null default now(),
  primary key (owner_id, trip_id, member_id, place_id)
);

alter table public.trip_group_invites enable row level security;
alter table public.trip_group_members enable row level security;
alter table public.trip_group_votes   enable row level security;
revoke all on table public.trip_group_invites from anon, authenticated;
revoke all on table public.trip_group_members from anon, authenticated;
revoke all on table public.trip_group_votes   from anon, authenticated;
