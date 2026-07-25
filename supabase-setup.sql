-- טיול+ · הקמת אחסון קישורי שיתוף קצרים (Supabase)
-- להריץ פעם אחת ב-SQL Editor של פרויקט ה-Supabase, ואז להגדיר
-- SUPABASE_URL + SUPABASE_ANON_KEY ב-.env.local / Vercel (ראו .env.example).

create table if not exists public.shared_trips (
  code text primary key,
  payload text not null,           -- ה-payload המקודד של הקישור (v1 base64url)
  created_at timestamptz not null default now()
);

alter table public.shared_trips enable row level security;

-- קישור משותף הוא ציבורי מעצם טיבו: כל אחד יוצר, כל אחד קורא לפי קוד.
-- אין עדכון/מחיקה דרך ה-anon key.
create policy "anyone can create share links"
  on public.shared_trips for insert
  to anon
  with check (true);

create policy "anyone can read a share link by code"
  on public.shared_trips for select
  to anon
  using (true);

-- בעתיד (חשבונות): alter table add column user_id uuid references auth.users,
-- ומדיניות שמותירה לבעלים לנהל את הקישורים שלו.
