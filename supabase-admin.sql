-- ============================================================
-- טיול+ : תפקידים (owner / admin), הענקות פרימיום, קודי הטבה,
--         דגלי מערכת ויומן ביקורת.
--
-- להריץ ב-SQL Editor של Supabase. אידמפוטנטי - בטוח להריץ שוב.
-- דרישות מוקדמות: supabase-profiles.sql ו-supabase-premium.sql כבר רצו.
--
-- ============================================================
-- עקרון האבטחה של הקובץ הזה, בשורה אחת:
-- **הלקוח לא יכול לכתוב לאף אחת מהעמודות והטבלאות שכאן.**
-- role, plan, plan_until ו-plan_source נכתבות אך ורק ע"י ה-service role
-- (כלומר קוד שרת עם SUPABASE_SERVICE_ROLE_KEY), ולעולם לא מטוקן משתמש.
-- אם המשתמש היה יכול לכתוב role, כל חשבון היה יכול להפוך את עצמו ל-owner
-- בקריאת REST אחת. זו הסיבה שההרשאות כאן ניתנות ברמת עמודה ולא רק RLS.
-- ============================================================


-- ------------------------------------------------------------
-- 1. תפקיד + פקיעת פרימיום + מקור הפרימיום
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin', 'owner'));

-- מתי הפרימיום פג. NULL = ללא הגבלת זמן (מנוי Stripe פעיל, או הענקה
-- "לתמיד"). ההשוואה נעשית בקוד דרך effectivePlan() ב-lib/plans.ts.
alter table public.profiles
  add column if not exists plan_until timestamptz;

-- 'stripe' = מנוי בתשלום · 'grant' = הענקה של אדמין · 'promo' = קוד הטבה.
-- בלי זה, webhook של Stripe שמוריד מנוי מבוטל היה מוריד גם פרימיום
-- שהוענק ידנית, ואי אפשר היה להבדיל בין לקוח משלם למי שקיבל מתנה.
alter table public.profiles
  add column if not exists plan_source text
    check (plan_source is null or plan_source in ('stripe', 'grant', 'promo'));

create index if not exists profiles_role_idx
  on public.profiles (role) where role <> 'user';

-- ------------------------------------------------------------
-- 2. הקשחה: רשימת העמודות שמשתמש מחובר יכול לכתוב, במפורש.
--    role / plan / plan_until / plan_source / stripe_customer_id אינן בה.
--    (חוזר על מה ש-supabase-premium.sql עשה, כדי שהקובץ הזה יהיה נכון
--    גם אם הוא רץ ראשון או אם מישהו שינה הרשאות בינתיים.)
-- ------------------------------------------------------------
revoke insert, update on table public.profiles from authenticated;
grant insert (user_id, display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;
grant update (display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;

-- ------------------------------------------------------------
-- 3. יומן ביקורת - כל פעולה של אדמין, בלי יוצא מן הכלל.
--    נשמר גם המייל ולא רק ה-uuid: אם חשבון נמחק, השורה עדיין קריאה.
-- ------------------------------------------------------------
create table if not exists public.admin_audit (
  id bigserial primary key,
  actor_user_id uuid not null,
  actor_email text,
  action text not null,
  target_user_id uuid,
  target_email text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_user_id);

alter table public.admin_audit enable row level security;
-- אין policies בכוונה: anon ו-authenticated חסומים לחלוטין. ה-service
-- role עוקף RLS, וזו הדרך היחידה לכתוב ולקרוא - כלומר גם אדמין רואה את
-- היומן רק דרך קוד השרת שלנו, שמאמת את התפקיד שלו קודם.
revoke all on table public.admin_audit from anon, authenticated;
revoke all on sequence public.admin_audit_id_seq from anon, authenticated;

-- ------------------------------------------------------------
-- 4. קודי הטבה - אדמין יוצר, המטייל פודה בעצמו
-- ------------------------------------------------------------
create table if not exists public.promo_codes (
  code text primary key,
  days integer not null check (days > 0 and days <= 3650),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redeemed integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code text not null references public.promo_codes (code) on delete cascade,
  user_id uuid not null,
  days integer not null,
  redeemed_at timestamptz not null default now(),
  -- מונע פדיון כפול של אותו קוד ע"י אותו משתמש **ברמת הדאטהבייס**, ולא
  -- בבדיקה בקוד שיכולה להיכשל בשתי בקשות במקביל.
  primary key (code, user_id)
);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;

-- ------------------------------------------------------------
-- 5. פדיון אטומי.
--
--    למה RPC ולא קריאה-ואז-כתיבה מהשרת: שתי בקשות במקביל על הקוד
--    האחרון היו שתיהן קוראות redeemed=0 ושתיהן מצליחות. כאן הבדיקה
--    והעדכון הם משפט אחד, ומפתח ראשי כפול תופס פדיון חוזר.
--
--    מחזיר: days אם נפדה, 0 אם הקוד לא קיים/כבוי/פג/מלא,
--            -1 אם המשתמש הזה כבר פדה אותו.
-- ------------------------------------------------------------
create or replace function public.redeem_promo(p_code text, p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  -- נעילת השורה כדי שמניית הפדיונות תהיה נכונה גם בתחרות
  select days into v_days
  from public.promo_codes
  where code = upper(trim(p_code))
    and active
    and (expires_at is null or expires_at > now())
    and redeemed < max_redemptions
  for update;

  if v_days is null then
    return 0;
  end if;

  begin
    insert into public.promo_redemptions (code, user_id, days)
    values (upper(trim(p_code)), p_user, v_days);
  exception when unique_violation then
    return -1;
  end;

  update public.promo_codes
  set redeemed = redeemed + 1
  where code = upper(trim(p_code));

  return v_days;
end;
$$;

revoke execute on function public.redeem_promo(text, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 6. דגלי מערכת - מפסק חירום בלי דיפלוי
--
--    agent_enabled=false מפיל את /api/chat לתשובות מבוססות-כללים בלי
--    מפתח, כלומר האתר ממשיך לעבוד וההוצאה על המודל נעצרת מיד.
-- ------------------------------------------------------------
create table if not exists public.app_flags (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_flags enable row level security;
revoke all on table public.app_flags from anon, authenticated;

insert into public.app_flags (key, value)
values ('agent_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 7. זריעת ה-owner.
--
--    **זו השורה היחידה בקובץ שצריך לערוך** אם הכתובת משתנה.
--    עובד גם אם המשתמש עוד לא נכנס אף פעם (אז אין לו שורת profiles):
--    במקרה כזה השורה נוצרת. אם הוא כבר קיים - רק התפקיד מתעדכן.
-- ------------------------------------------------------------
do $$
declare
  v_email text := 'natikyan153@gmail.com';
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise notice 'טיול+: המשתמש % עוד לא נרשם. להריץ את הקובץ הזה שוב אחרי ההתחברות הראשונה שלו.', v_email;
    return;
  end if;

  insert into public.profiles (user_id, role)
  values (v_uid, 'owner')
  on conflict (user_id) do update set role = 'owner';

  insert into public.admin_audit (actor_user_id, actor_email, action, target_user_id, target_email, detail)
  values (v_uid, v_email, 'seed_owner', v_uid, v_email, jsonb_build_object('source', 'supabase-admin.sql'));

  raise notice 'טיול+: % הוגדר כ-owner.', v_email;
end $$;
