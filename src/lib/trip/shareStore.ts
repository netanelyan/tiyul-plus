/**
 * שרת בלבד - לא לייבא מקומפוננטת client (המפתחות ב-env של השרת;
 * החבילה server-only לא בפרויקט, אז ההגנה היא המוסכמה הזו).
 *
 * אחסון קישורי שיתוף קצרים - Supabase (REST, בלי תלות חדשה).
 *
 * ## מה השתנה כאן, ולמה זה לא רק החלפת מפתח
 *
 * הטבלה נשאה מדיניות `select ... to anon using (true)` בשם
 * "anyone can read a share link by code". **השם תיאר כוונה שהתנאי לא
 * ביטא**: `using (true)` הוא "כל שורה", ולכן כל מי שמחזיק את מפתח
 * ה-anon - שנשלח בכל דף שאנחנו מגישים - יכול היה למשוך את כל קישורי
 * השיתוף באתר בבקשה אחת.
 *
 * "צריך לדעת את הקוד" אינו תנאי שאפשר לנסח ב-RLS: מדיניות רואה שורה,
 * לא שאילתה, ולכן היא לא יכולה לדרוש שהקורא ציין `code`. לכן שני
 * המסלולים כאן שינו צורה, וכל אחד מסיבה אחרת:
 *
 * - **קריאה** עוברת ל-`get_shared_trip(code)` (`security definer`).
 *   לפונקציה אין גרסה שמחזירה רשימה, ולכן "שורה אחת לפי קוד" הוא
 *   מבנה ולא הסכמה. אין כאן `select` על הטבלה בכלל.
 * - **כתיבה** עוברת ל-service role, כלומר רק מהשרת שלנו, כלומר תמיד
 *   מאחורי המכסות של `/api/share`. המדיניות הקודמת אפשרה לכל דפדפן
 *   לכתוב ישירות ולעקוף אותן לגמרי.
 *
 * טבלת shared_trips (ראו supabase-setup.sql ו-supabase-rls-fix.sql):
 * code (PK) ← ה-payload המקודד של v1. שומרים את אותו base64url
 * שהקישור הארוך נושא, כך שהפענוח והאימות מול הדאטה האוצרת נשארים
 * ב-decodeTripShare - נקודת אמת אחת.
 *
 * **בלי `SUPABASE_SERVICE_ROLE_KEY` יצירת קישור קצר כבויה בשקט**
 * והלקוח נופל לקישור הארוך, שעובד במלואו ואינו תלוי בשום backend.
 * קריאה של קישורים קיימים ממשיכה לעבוד גם בלעדיו, כי לפונקציה יש
 * הרשאת הרצה ל-anon.
 *
 * כשיגיעו חשבונות משתמש: אותה טבלה מקבלת עמודת user_id והטיולים
 * נשמרים תחת החשבון - הקוד הקצר כבר ערוך לזה.
 */

import { pgIdent } from '@/lib/server/pgrest';

const baseUrl = () => process.env.SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; // בלי io01l

/** צורת הקוד - אותה צורה בדיוק נאכפת גם בתוך הפונקציה ב-SQL */
const CODE_SHAPE = /^[a-zA-Z0-9]{6,12}$/;

function randomCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * מפתחות anon בפורמט הישן הם JWT ונשלחים גם כ-Bearer; מפתחות
 * `sb_publishable_` / `sb_secret_` החדשים עוברים ב-apikey בלבד
 * (PostgREST דוחה Bearer עם ערך שאינו JWT).
 */
function headers(key: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

/** קריאה עובדת עם כל מפתח - הפונקציה מוענקת ל-anon ול-service_role */
const readKey = () => serviceKey() ?? anonKey();

/** קריאת קישור קיים אפשרית */
export const shareReadEnabled = () => Boolean(baseUrl() && readKey());

/**
 * יצירת קישור קצר אפשרית. **דורש service role בכוונה** - זו הדרך
 * היחידה להבטיח שכל כתיבה עברה דרך המכסות שלנו.
 */
export const shareCreateEnabled = () => Boolean(baseUrl() && serviceKey());

/** שומר payload ומחזיר קוד קצר, או null אם האחסון לא מוגדר/נכשל */
export async function createShareCode(payload: string): Promise<string | null> {
  if (!shareCreateEnabled()) return null;
  const url = baseUrl()!;
  const h = headers(serviceKey()!);
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode();
    try {
      const res = await fetch(`${url}/rest/v1/${pgIdent('shared_trips')}`, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ code, payload }),
      });
      if (res.ok) return code;
      if (res.status === 409) continue; // התנגשות קוד נדירה - מגרילים שוב
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * מאחזר payload לפי קוד קצר; null אם לא קיים או שהאחסון כבוי.
 *
 * דרך ה-RPC ולא דרך `select` על הטבלה: לפונקציה אין צורה שמחזירה
 * יותר משורה אחת, ולכן גם באג בקוד הזה לא יכול להפוך אותה לרשימה.
 */
export async function getSharedPayload(code: string): Promise<string | null> {
  if (!shareReadEnabled()) return null;
  // בדיקה מקומית לפני הרשת. אותה בדיקה חוזרת בתוך הפונקציה ב-SQL,
  // כי הצד היחיד שאפשר לסמוך עליו הוא הצד שלא ניתן לעקוף.
  if (!CODE_SHAPE.test(code)) return null;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/rpc/${pgIdent('get_shared_trip')}`, {
      method: 'POST',
      headers: headers(readKey()!),
      body: JSON.stringify({ p_code: code }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    // הפונקציה מחזירה scalar: מחרוזת ה-payload, או null.
    const payload = (await res.json()) as unknown;
    return typeof payload === 'string' && payload.length > 0 ? payload : null;
  } catch {
    return null;
  }
}
