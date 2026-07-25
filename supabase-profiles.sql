-- טיול+ · שלב 3: פרופיל משתמש (האזור האישי)
-- להריץ פעם אחת ב-SQL Editor (אחרי supabase-setup.sql ו-supabase-accounts.sql).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  -- תמונת פרופיל כ-data URL מוקטן (נדחס בצד הלקוח ל~20KB);
  -- מעבר ל-Supabase Storage הוא שדרוג עתידי שקוף
  avatar text,
  -- קודי מדינות (ISO2) שהמשתמש ביקר בהן - פיצ'ר "חותמות בדרכון"
  visited jsonb not null default '[]',
  -- העדפות ברירת-מחדל של החשבון (למשל kosher)
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

create policy "own profile insert" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);

create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
