-- ============================================================
--  טיול+ · תקרת הוצאה יומית ורישום עלויות
--  להריץ ב-Supabase → SQL Editor. בטוח להריץ פעמיים.
-- ============================================================
--
--  בלי הקובץ הזה המערכת עדיין עובדת: התקרה נאכפת מהזיכרון של כל
--  instance, והמספרים באזור הניהול פשוט לא נשמרים בין הפעלות. עם
--  הקובץ - התקרה משותפת לכל ה-instances וההיסטוריה נשמרת.
--
--  פרטיות: שתי הטבלאות נגישות ל-service role בלבד. אין בהן טקסט של
--  המשתמש - רק מזהים, מספרי טוקנים ועלות.
-- ============================================================

-- ---------- 1. שורה לכל קריאת מודל ----------
create table if not exists public.ai_spend (
  id           bigserial primary key,
  day          date        not null,
  at           timestamptz not null default now(),
  -- 'user:<uuid>' או 'ip:<addr>' - אותה זהות של מנגנון המכסות
  identity     text        not null,
  user_id      uuid,
  trip_id      text,
  route        text        not null,          -- 'chat' | 'generate-trip'
  model        text        not null,
  in_tokens    integer     not null default 0,
  cached_tokens integer    not null default 0,
  write_tokens integer     not null default 0,
  out_tokens   integer     not null default 0,
  usd          numeric(12, 6) not null default 0
);

create index if not exists ai_spend_day_idx     on public.ai_spend (day desc);
create index if not exists ai_spend_user_idx    on public.ai_spend (user_id, day desc);
create index if not exists ai_spend_trip_idx    on public.ai_spend (trip_id, day desc);

-- ---------- 2. סיכום יומי - שורה אחת ליום ----------
--  קיים בנפרד ולא כ-view: בדיקת התקרה רצה לפני **כל** בקשה, וסכימה
--  של מיליוני שורות בכל פעם היא בדיוק סוג ההוצאה שהיא באה למנוע.
create table if not exists public.ai_spend_daily (
  day        date primary key,
  usd        numeric(12, 6) not null default 0,
  requests   integer        not null default 0,
  -- מתי נשלחה ההתראה על התקרבות לתקרה. פעם אחת ליום, לכל ה-instances.
  alerted_at timestamptz
);

-- ---------- 3. עדכון אטומי ----------
--  אותה תבנית כמו bump_usage: insert on conflict update, כדי ששני
--  instances שכותבים באותו רגע לא ידרסו זה את זה.
create or replace function public.bump_ai_spend(p_day date, p_usd numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
begin
  insert into public.ai_spend_daily (day, usd, requests)
  values (p_day, p_usd, 1)
  on conflict (day) do update
    set usd = public.ai_spend_daily.usd + excluded.usd,
        requests = public.ai_spend_daily.requests + 1
  returning usd into total;
  return total;
end;
$$;

--  סימון שההתראה נשלחה. מחזיר true רק ל**קורא הראשון** - כך שגם עם
--  כמה instances ההתראה נשלחת פעם אחת ולא עשר.
create or replace function public.claim_ai_spend_alert(p_day date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.ai_spend_daily
     set alerted_at = now()
   where day = p_day and alerted_at is null
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

-- ---------- 4. הרשאות ----------
alter table public.ai_spend       enable row level security;
alter table public.ai_spend_daily enable row level security;
-- אין policy בכוונה: RLS דלוק בלי policy = service role בלבד.
revoke all on public.ai_spend       from anon, authenticated;
revoke all on public.ai_spend_daily from anon, authenticated;
revoke all on function public.bump_ai_spend(date, numeric)   from anon, authenticated;
revoke all on function public.claim_ai_spend_alert(date)     from anon, authenticated;

-- ---------- 5. תקרת ברירת המחדל ----------
--  נכתבת רק אם אין ערך, כדי שהרצה שנייה לא תדרוס שינוי שעשית באזור
--  הניהול. לשינוי: /admin → "תקרת הוצאה", או השורה הזאת עם ערך אחר.
insert into public.app_flags (key, value)
values ('ai_daily_budget_usd', '5'::jsonb)
on conflict (key) do nothing;
