/**
 * שרת בלבד. **לעולם לא לייבא מקומפוננטת client** - המפתח כאן עוקף RLS
 * לחלוטין, ודליפה שלו לדפדפן שווה למסירת הדאטהבייס.
 *
 * REST ישיר מול Supabase עם ה-service role, בלי תלות חדשה (חוק קשיח 6),
 * באותו סגנון כמו `trip/shareStore.ts`.
 *
 * **שמות טבלה/פונקציה וה-uuid נכנסים לנתיב ה-URL ולכן עוברים אימות**
 * (`pgIdent` / `pgUuid`), והפילטרים נבנים ב-`pgrest.ts` בלבד - שם כל
 * ערך מקודד. שתי השכבות האלה הן מה שהופך הזרקה ל-PostgREST לבלתי
 * אפשרית מבנית ולא "בתנאי שכל קורא זכר להצפין".
 *
 * בלי `SUPABASE_SERVICE_ROLE_KEY` הכל מחזיר null / false והפיצ׳רים
 * שתלויים בו כבויים בשקט - האתר עצמו ממשיך לעבוד בדיוק כמו קודם. זה
 * המצב בפועל עד שנתנאל מריץ את ה-SQL ומוסיף את המפתח.
 */

import { pgIdent, pgUuid } from '@/lib/server/pgrest';

const url = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const adminDbEnabled = () => Boolean(url() && serviceKey());

/**
 * **המקום היחיד שבונה כותרות service role.** `limits.ts` ו-`budget.ts`
 * החזיקו עותק משלהן ששולח `Bearer` תמיד - ולכן עם מפתח `sb_secret_`
 * (שאינו JWT) כל כתיבה שלהן נדחתה בשקט, והמונים בלוח הבקרה הראו אפס
 * בזמן שקריאות באמת נעשו. עותק שני של לוגיקה כזאת הוא באג בהמתנה.
 */
export function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return headers(extra);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const k = serviceKey()!;
  const h: Record<string, string> = {
    apikey: k,
    'Content-Type': 'application/json',
    ...extra,
  };
  // רק מפתחות בפורמט הישן הם JWT ונשלחים גם כ-Bearer. מפתחות
  // `sb_secret_...` החדשים של Supabase אינם JWT, ו-PostgREST דוחה Bearer
  // עם ערך שאינו JWT - כלומר שליחה עיוורת של שניהם הייתה מפילה את אזור
  // הניהול דווקא בפרויקטים חדשים. אותה הבחנה קיימת כבר ב-trip/shareStore.ts
  // עבור מפתח ה-anon; היא הוחמצה כאן.
  if (k.startsWith('eyJ')) h.Authorization = `Bearer ${k}`;
  return h;
}

/** GET על טבלה/view. `query` הוא query string של PostgREST בלי ה-? */
export async function adminSelect<T>(table: string, query: string): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** DELETE לפי שאילתת pgrest. מחזיר את השורות שנמחקו (או null בכישלון). */
export async function adminDelete<T>(table: string, query: string): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      method: 'DELETE',
      headers: headers({ Prefer: 'return=representation' }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** PATCH לפי תנאי. מחזיר את השורות המעודכנות, או null בכישלון. */
export async function adminUpdate<T>(
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/**
 * INSERT (עם upsert אופציונלי לפי מפתח ראשי).
 *
 * `ignoreDuplicates` הוא הצורה השנייה של upsert: כפילות לא נכתבת
 * **וגם לא מוחזרת** - מערך ריק פירושו "הכול היה כפול". זה מה שמאפשר
 * לנתיב הניוזלטר לספור רק כתובות חדשות באמת בלי לשנות את התשובה
 * ללקוח (שנשארת זהה לחדש ולכפול, בכוונה - שהטופס לא יהפוך לבודק
 * "האם הכתובת הזאת רשומה"). הבדל תוכן אחד מ-merge: כפילות לא נוגעת
 * בשורה הקיימת - חתימת המקור והתאריך המקוריים נשמרים.
 */
export async function adminInsert<T>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  opts: { upsert?: boolean; ignoreDuplicates?: boolean } = {},
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}`, {
      method: 'POST',
      headers: headers({
        Prefer: opts.ignoreDuplicates
          ? 'resolution=ignore-duplicates,return=representation'
          : opts.upsert
            ? 'resolution=merge-duplicates,return=representation'
            : 'return=representation',
      }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** קריאת RPC (security definer) */
export async function adminRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/rpc/${pgIdent(fn)}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * מייל לפי uuid ולהיפך, דרך Admin API של GoTrue. המיילים יושבים ב-auth
 * ולא ב-profiles, ובכוונה: הם לא נחשפים לאף שאילתה של לקוח.
 */
export async function userByEmail(email: string): Promise<{ id: string; email: string } | null> {
  if (!adminDbEnabled()) return null;
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return null;
  try {
    const res = await fetch(
      `${url()}/auth/v1/admin/users?filter=${encodeURIComponent(clean)}&per_page=50`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { id: string; email?: string }[] };
    // filter הוא חיפוש חלקי - מחייבים התאמה מדויקת כדי שלא נפעל על
    // חשבון דומה בטעות (מייל הוא מזהה, לא חיפוש חופשי)
    const hit = (data.users ?? []).find((u) => (u.email ?? '').toLowerCase() === clean);
    return hit ? { id: hit.id, email: hit.email ?? clean } : null;
  } catch {
    return null;
  }
}

/**
 * מטמון מייל-לפי-uuid, בזיכרון התהליך. מייל של חשבון כמעט לא משתנה,
 * וכל טעינת דשבורד אדמין שלפה את אותם מיילים שוב - קריאת HTTP אחת
 * ל-GoTrue לכל שורה מוצגת, ועוד אחת ב-`requireRole` על כל בקשת אדמין.
 * TTL קצר (10 דק׳) כי המחיר של ערך ישן הוא קוסמטי בלבד (תצוגה בדשבורד,
 * ושדה actor ביומן הביקורת - שממילא נושא גם uuid). **כישלון לא נשמר**:
 * null מהרשת יכול להיות תקלה זמנית, ולקבע אותו ל-10 דקות היה מציג
 * "אין מייל" על חשבון תקין.
 */
const EMAIL_TTL_MS = 10 * 60_000;
const emailCache = new Map<string, { email: string; at: number }>();

export async function emailByUserId(userId: string): Promise<string | null> {
  if (!adminDbEnabled()) return null;
  const hit = emailCache.get(userId);
  if (hit && Date.now() - hit.at < EMAIL_TTL_MS) return hit.email;
  try {
    const res = await fetch(`${url()}/auth/v1/admin/users/${pgUuid(userId)}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { email?: string };
    if (u.email) {
      emailCache.set(userId, { email: u.email, at: Date.now() });
      if (emailCache.size > 5_000) emailCache.clear(); // הגנת זיכרון גסה
    }
    return u.email ?? null;
  } catch {
    return null;
  }
}

/**
 * שליפת מיילים לכמה משתמשים במקביל - התיקון לדפוס ה-N+1 שישב בשלושה
 * נתיבי אדמין (purchases / trips / spend): לולאת `await` טורית ששילמה
 * סיבוב רשת מלא לכל שורה. ל-GoTrue אין endpoint אצווה, אז המקבילות
 * היא Promise.all - N סיבובים במקביל במקום בטור, והמטמון למעלה הופך
 * את הטעינה השנייה של אותו דשבורד לאפס קריאות רשת.
 */
export async function emailsByUserIds(userIds: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(userIds)];
  const pairs = await Promise.all(
    unique.map(async (id) => [id, await emailByUserId(id)] as const),
  );
  return new Map(pairs);
}

/**
 * מספר החשבונות האמיתי, מ-`auth.users` ולא מ-`profiles`.
 *
 * ## הבאג שהפונקציה הזאת נולדה ממנה
 *
 * לוח המצב הראה "חשבונות: 1" בזמן שלנתנאל היו כמה חשבונות של בני משפחה.
 * הסיבה: ספרתי שורות ב-`profiles`, ושורה שם נוצרת רק כשמישהו **שומר**
 * פרופיל (שם תצוגה, תמונה, דרכון מדינות). מי שנכנס והשתמש באתר בלי
 * לגעת באזור האישי פשוט לא קיים שם.
 *
 * המסקנה הכללית: `profiles` היא טבלת העדפות, לא רשימת המשתמשים. רשימת
 * המשתמשים היא `auth.users`, ואליה מגיעים דרך Admin API של GoTrue.
 *
 * דפדוף: GoTrue מחזיר עד `per_page` בכל עמוד ולא מבטיח שדה total, ולכן
 * מדפדפים עד שעמוד חוזר חלקי. תקרה של 25 עמודות (5,000 חשבונות) שומרת
 * מפני לופ, ומסומנת ב-`capped` כדי שהמספר לא יוצג כמדויק אם נחתך.
 */
export async function countAuthUsers(): Promise<{ total: number; capped: boolean } | null> {
  if (!adminDbEnabled()) return null;
  const perPage = 200;
  let total = 0;
  for (let page = 1; page <= 25; page++) {
    try {
      const res = await fetch(`${url()}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        headers: headers(),
        cache: 'no-store',
      });
      if (!res.ok) return page === 1 ? null : { total, capped: false };
      const data = (await res.json()) as { users?: unknown[] };
      const n = Array.isArray(data.users) ? data.users.length : 0;
      total += n;
      if (n < perPage) return { total, capped: false };
    } catch {
      return page === 1 ? null : { total, capped: false };
    }
  }
  return { total, capped: true };
}
