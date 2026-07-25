-- ============================================================
-- טיול+ פרימיום: תוכנית על הפרופיל + מונה שימוש יומי
-- להריץ ב-SQL Editor של Supabase (אידמפוטנטי - בטוח להריץ שוב).
-- דרישה מוקדמת: supabase-profiles.sql כבר רץ (טבלת profiles קיימת).
-- ============================================================

-- 1. עמודת התוכנית + מזהה הלקוח ב-Stripe
alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium'));
alter table public.profiles
  add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- 2. הקשחה קריטית: משתמש לא יכול לשדרג את עצמו.
--    RLS כבר מגביל לשורה של המשתמש; הרשאות ברמת עמודה מגבילות *אילו*
--    עמודות מותר לו לכתוב - plan ו-stripe_customer_id נכתבות רק ע"י
--    ה-service role (ה-webhook של Stripe).
revoke insert, update on table public.profiles from authenticated;
grant insert (user_id, display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;
grant update (display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;

-- 3. מונה שימוש יומי (יחידות AI) - service role בלבד.
--    identity = 'user:<uuid>' או 'ip:<addr>'; אין כאן שום תוכן אישי.
create table if not exists public.usage_daily (
  identity text not null,
  day date not null,
  units bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (identity, day)
);

alter table public.usage_daily enable row level security;
-- אין policies בכוונה: anon/authenticated חסומים לגמרי;
-- ה-service role עוקף RLS וזו הדרך היחידה פנימה.
revoke all on table public.usage_daily from anon, authenticated;

-- 4. עדכון אטומי של המונה (insert-or-increment) - service role בלבד
create or replace function public.bump_usage(p_identity text, p_day date, p_units bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_daily (identity, day, units, updated_at)
  values (p_identity, p_day, greatest(p_units, 0), now())
  on conflict (identity, day)
  do update set units = usage_daily.units + greatest(excluded.units, 0), updated_at = now();
$$;

revoke execute on function public.bump_usage(text, date, bigint) from public, anon, authenticated;

-- 5. ניקוי אוטומטי לא נדרש מיידית - שורה ליום לזהות; אפשר להוסיף בהמשך
--    משימת ניקוי לשורות בנות 90+ ימים.
