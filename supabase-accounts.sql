-- טיול+ · שלב 2: חשבונות משתמש - טבלת הטיולים המסונכרנים
-- להריץ פעם אחת ב-SQL Editor של פרויקט ה-Supabase (אחרי supabase-setup.sql).
--
-- בנוסף, ב-Authentication → Sign In / Up: לוודא ש-Email מופעל.
-- ההתחברות באתר היא בקוד חד-פעמי למייל (OTP) - בלי סיסמאות.

create table if not exists public.user_trips (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,                 -- Trip.id מהאפליקציה
  data jsonb not null,              -- אובייקט הטיול המלא
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_trips enable row level security;

-- כל משתמש רואה ומנהל אך ורק את השורות שלו. הלקוח לא שולח user_id
-- בקריאות קריאה/מחיקה - RLS גוזר את הזהות מהטוקן.
create policy "own trips select" on public.user_trips
  for select to authenticated using (auth.uid() = user_id);

create policy "own trips insert" on public.user_trips
  for insert to authenticated with check (auth.uid() = user_id);

create policy "own trips update" on public.user_trips
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own trips delete" on public.user_trips
  for delete to authenticated using (auth.uid() = user_id);
