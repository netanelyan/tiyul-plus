-- טיול+ · בדיקה לפני הנסיעה: טבלת הרכישות · 2026-08-12
--
-- ############################################################
-- להריץ פעם אחת ב-SQL Editor. אידמפוטנטי - בטוח להריץ שוב.
-- ############################################################
--
-- המוצר הראשון בתשלום באתר: רכישה חד-פעמית של "בדיקה לפני הנסיעה"
-- לטיול ספציפי. שורה אחת = ניסיון רכישה אחד.
--
-- ## הכלל היחיד שהטבלה הזאת קיימת כדי לאכוף
--
-- **הענקת גישה קורית רק כתוצאה מ-webhook מאומת של PayPal (או מפעולת
-- אדמין מפורשת), לעולם לא מקריאה שמגיעה ישירות מהדפדפן.** ולכן אין
-- לטבלה הזאת אף מדיניות RLS ל-`anon` או ל-`authenticated` - RLS דלוקה
-- ובלי אף מדיניות פירושה "אף אחד", בדיוק כמו התיקון ל-`shared_trips`
-- (ראו `supabase-rls-fix.sql`). כל קריאה וכתיבה עוברות אך ורק דרך
-- נתיבי ה-API עם ה-service role, שעוקף RLS בהגדרה. אין כאן דרך
-- למשתמש לקרוא את השורה של עצמו ישירות מהדפדפן - `/api/checks/status`
-- הוא הדרך היחידה, ומחזיר תת-קבוצה צרה בלבד.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id text not null,               -- Trip.id מהאפליקציה (לא foreign key - הטיול חי ב-user_trips)
  product text not null default 'predeparture-check',
  amount numeric(10,2) not null,       -- מה שחויב בפועל. 0 עבור source='admin_grant'.
  currency text not null default 'ILS',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'revoked')),
  -- 'paypal' = תשלום אמיתי; 'admin_grant' = הענקה ידנית מ-/admin;
  -- 'premium_included' = הטבת מנוי פרימיום אוטומטית. שני האחרונים הם
  -- **לא** הכנסה אמיתית (amount=0) - ההבדל הזה הוא מה ששומר על הדוח
  -- הפיננסי נכון, באותו עיקרון בדיוק כמו plan_source ב-supabase-premium.sql,
  -- והם נספרים בנפרד זה מזה כדי להבדיל תמיכה אנושית מהטבת מנוי.
  -- הרשימה כאן חייבת להישאר תואמת ל-PurchaseSource ב-lib/server/purchases.ts;
  -- להתקנה שרצה עם הגרסה הישנה, supabase-premium-budget.sql מרחיב את
  -- המגבלה - שני הקבצים בטוחים בכל סדר הרצה.
  source text not null default 'paypal'
    check (source in ('paypal', 'admin_grant', 'premium_included')),
  -- באיזה סביבת PayPal זה קרה. purchase שנוצר תחת sandbox לעולם לא
  -- יכול להיחשב paid על ידי קוד שרץ תחת production, ולהיפך - ראו
  -- ההערה על כך ב-server/paypal.ts (sandboxBlocked).
  mode text not null default 'sandbox'
    check (mode in ('sandbox', 'production')),
  paypal_order_id text unique,         -- מוגדר מיד ביצירת ההזמנה
  paypal_capture_id text unique,       -- מוגדר רק מה-webhook - זה שמבטיח שאותה לכידה לא תיזקף פעמיים
  paypal_payer_email text,
  -- תמונת מצב של הבדיקה **בזמן ההענקה** - לא מחושבת מחדש בכל צפייה,
  -- כדי ש"הדוח שקיבלתם" יישאר יציב גם אם הקטלוג משתנה אחר כך.
  report jsonb,
  raw_webhook jsonb,                   -- ה-payload הגולמי, לצורך תשובה על שאלה בעוד חצי שנה
  note text,                           -- הערת אדמין בהענקה/שלילה ידנית
  granted_by uuid references auth.users (id), -- מי מהצוות ביצע הענקה/שלילה ידנית, אם בכלל
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_trip_idx on public.purchases (user_id, trip_id);
create index if not exists purchases_pending_idx on public.purchases (created_at) where status = 'pending';

alter table public.purchases enable row level security;

-- שום מדיניות בכוונה - ראו ההסבר למעלה. GRANT מוצהר במפורש ולא נשען
-- על הרשאת ברירת מחדל, מאותה סיבה שנרשמה ב-supabase-rls-fix.sql:
-- "השרת עדיין עובד" הוא בדיוק הדבר שאסור שיהיה תלוי בהנחה.
revoke all on public.purchases from anon, authenticated;
grant select, insert, update on public.purchases to service_role;

-- ---------- אימות ----------
-- להריץ אחרי זה, אם רוצים לוודא: `select * from public.purchases limit 1;`
-- כמשתמש authenticated רגיל (לא service_role) צריך להיכשל/להחזיר ריק.
