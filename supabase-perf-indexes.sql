-- טיול+ · אינדקסים לשאילתות שכבר קיימות בקוד ורצות בלי אינדקס תומך
-- להריץ פעם אחת ב-Supabase → SQL Editor. אידמפוטנטי - בטוח להריץ שוב.
--
-- שלושתם נמצאו באותה שיטה: לקרוא כל שאילתה שהקוד שולח ל-PostgREST
-- ולבדוק אם קיים אינדקס שמכסה את ה-WHERE/ORDER BY שלה. אף אחד מהם
-- לא מונע תפקוד היום - הטבלאות עדיין קטנות - אבל שלושתם גדלים ללא
-- הגבלה (שורה אחת לכל קריאת AI / רכישה / פרופיל ציבורי), וסריקה
-- מלאה שעולה לינארית עם מספר השורות היא בדיוק סוג ההאטה שלא רואים
-- עד שהיא כבר כואבת.

-- ---------- 1. lastHeavyCallAt() ב-lib/server/budget.ts ----------
-- השאילתה: `ai_spend?route=eq.chat&select=at&order=at.desc&limit=1`
-- (ולפעמים גם `identity=neq.system:warm`). רצה בנתיב החימום, כלומר
-- בתדירות הגבוהה ביותר מכל שאילתה במסמך הזה. האינדקסים הקיימים על
-- ai_spend הם (day desc), (user_id, day desc) ו-(trip_id, day desc) -
-- אף אחד מהם לא מכסה סינון לפי route עם מיון לפי at, ולכן השאילתה
-- הזו מבצעת היום סריקת טבלה מלאה + מיון בכל קריאה. שורה אחת נכתבת
-- לכל קריאת מודל אמיתית, כך שהעלות גדלה בלי הפסקה.
create index if not exists ai_spend_route_at_idx
  on public.ai_spend (route, at desc);

-- ---------- 2. recentPurchases() ב-lib/server/purchases.ts ----------
-- השאילתה: `purchases?select=...&order=created_at.desc&limit=N` בלי
-- שום פילטר - זו רשימת "הרכישות האחרונות" בלוח הניהול
-- (/api/admin/purchases). האינדקסים הקיימים הם (user_id, trip_id)
-- ואינדקס חלקי על created_at רק כש-status='pending' - אף אחד מהם לא
-- משרת מיון גלובלי לפי created_at על כל הטבלה.
create index if not exists purchases_created_idx
  on public.purchases (created_at desc);

-- ---------- 3. searchPublicProfiles() ב-lib/auth/profile.ts ----------
-- השאילתה: `.ilike('display_name', '%q%')` - חיפוש מטיילים בקהילה.
-- ה-`%` המוביל פוסל שימוש באינדקס btree רגיל (btree לא יכול לקצר
-- חיפוש שלא מתחיל מהתו הראשון). pg_trgm + GIN הם הדרך הנכונה
-- לחיפוש טקסט-חלקי ב-Postgres/Supabase; ההרחבה כבר זמינה כברירת
-- מחדל בפרויקטי Supabase ואינה תלות npm חדשה.
create extension if not exists pg_trgm;

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);

-- ---------- אימות ----------
-- `explain select ... from ai_spend where route='chat' order by at desc limit 1;`
-- אמור להראות "Index Scan" על ai_spend_route_at_idx ולא "Seq Scan".
-- אותו דבר ל-purchases עם `order by created_at desc limit 20;`
-- ול-profiles עם `where display_name ilike '%א%';`.
