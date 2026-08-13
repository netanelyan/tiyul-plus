-- ============================================================
--  תיקון הרשאות ריצה על שלוש פונקציות
--
--  ## מה הבעיה
--
--  ב-PostgreSQL, פונקציה חדשה מקבלת EXECUTE ל-**PUBLIC** אוטומטית.
--  `PUBLIC` הוא לא "אף אחד" ולא "כולם המחוברים" - הוא תפקיד-על שכל
--  תפקיד יורש ממנו, כולל `anon` ו-`authenticated`.
--
--  שלוש פונקציות בפרויקט הזה נשללו מ-`anon, authenticated` בלבד:
--
--      revoke all on function public.bump_ai_spend(...) from anon, authenticated;
--
--  שלילה כזאת מסירה הענקה **ישירה**, והפונקציה נשארת זמינה דרך
--  ההענקה שיורשים מ-PUBLIC. כלומר: כל מי שמחזיק במפתח ה-anon
--  הציבורי (שנמצא בחבילת הדפדפן בכוונה) יכול לקרוא להן.
--
--  נמדד על Postgres 16 מקומי, לא הוסק:
--
--      revoke all ... from anon, authenticated   -> has_function_privilege('anon',...,'execute') = t
--      revoke all ... from public, anon, ...     -> has_function_privilege('anon',...,'execute') = f
--
--  ובקריאה בפועל: תפקיד `anon` הצליח לכתוב 9999 לטבלה שאין לו עליה
--  שום הרשאה ושה-RLS שלה דלוק בלי אף policy - כי הפונקציה היא
--  `security definer`, וזו כל מטרתה.
--
--  שתי הפונקציות שכן נכתבו נכון - `bump_usage` ו-`redeem_promo`,
--  ששתיהן נשללו `from public, anon, authenticated` מהיום הראשון -
--  הן גם ההוכחה שהתיקון הזה בטוח: השרת קורא להן דרך service_role
--  והן עובדות בפרודקשן.
--
--  ## מה זה לא
--
--  אין כאן שינוי קוד. הקובץ הזה עומד בפני עצמו, ואפשר להריץ אותו
--  מיד ובלי שום דיפלוי - בשונה מ-supabase-rls-fix.sql, שחייב היה
--  לנחות יחד עם הקוד.
--
--  בטוח להרצה גם אם לא הרצת עדיין את supabase-ai-spend.sql או את
--  supabase-admin-dash.sql: פונקציה שלא קיימת פשוט מדולגת.
-- ============================================================

do $$
declare
  fn text;
  sig text;
begin
  foreach sig in array array[
    'public.bump_ai_spend(date, numeric, boolean, text)',
    'public.claim_ai_spend_alert(date)',
    'public.bump_event(date, text)'
  ]
  loop
    if to_regprocedure(sig) is null then
      raise notice 'skip (not created yet): %', sig;
      continue;
    end if;
    -- זו השורה שהייתה חסרה
    execute format('revoke all on function %s from public', sig);
    execute format('revoke all on function %s from anon, authenticated', sig);
    -- **מפורש ולא בירושה.** בתיקון של shared_trips הסתמכתי על
    -- הרשאות ברירת המחדל של service_role והשרת קיבל permission
    -- denied. אותה טעות לא נעשית פעמיים.
    execute format('grant execute on function %s to service_role', sig);
    raise notice 'fixed: %', sig;
  end loop;
end $$;

-- ---------- find_traveler_by_email: מחוברים בלבד, לא אנונימיים ----------
--  נמדד על הדאטהבייס החי: anon_can_call = true. הקובץ המקורי אמנם שולל
--  `from public`, אבל בפועל ההרשאה קיימת - כנראה מריצה של גרסה מוקדמת
--  יותר של supabase-community.sql. כל עוד היא פתוחה, כל מי שמחזיק במפתח
--  ה-anon יכול לבדוק כתובת מייל אחת-אחת ולקבל שם, תמונה ורשימת מדינות של
--  בעליה - בלי חשבון. ההתאמה המדויקת מונעת סריקה עיוורת ולא בדיקה של
--  כתובת שכבר ידועה.
do $$
declare sig text := 'public.find_traveler_by_email(text)';
begin
  if to_regprocedure(sig) is null then
    raise notice 'skip (not created yet): %', sig;
  else
    execute format('revoke all on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated, service_role', sig);
    if has_function_privilege('anon', sig, 'execute') then
      raise exception 'STILL OPEN TO anon: %', sig;
    end if;
    if not has_function_privilege('authenticated', sig, 'execute') then
      raise exception 'TRAVELER SEARCH BROKEN: authenticated lost %', sig;
    end if;
    raise notice 'fixed: % (authenticated only)', sig;
  end if;
end $$;

-- ---------- אימות עצמי: נכשל אם משהו נשאר פתוח ----------
do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.bump_ai_spend(date, numeric, boolean, text)',
    'public.claim_ai_spend_alert(date)',
    'public.bump_event(date, text)',
    'public.bump_usage(text, date, bigint)',
    'public.redeem_promo(text, uuid)'
  ]
  loop
    if to_regprocedure(sig) is null then continue; end if;
    if has_function_privilege('anon', sig, 'execute') then
      raise exception 'STILL OPEN TO anon: %', sig;
    end if;
    if has_function_privilege('authenticated', sig, 'execute') then
      raise exception 'STILL OPEN TO authenticated: %', sig;
    end if;
    if not has_function_privilege('service_role', sig, 'execute') then
      raise exception 'SERVER LOST ACCESS: %', sig;
    end if;
  end loop;
  raise notice 'OK - all internal RPCs are service_role only, and the server still has them';
end $$;

-- ---------- מה שאמור להישאר פתוח, ובכוונה ----------
--  get_shared_trip(text)          -> anon+authenticated. פותח קישור /t/<code>.
--  find_traveler_by_email(text)   -> authenticated בלבד. חיפוש מטיילים.
--  שתיהן נשללו `from public` כבר ואז הוענקו במפורש - הדפוס הנכון.
