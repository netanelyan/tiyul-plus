/**
 * שרת בלבד - לא לייבא מקומפוננטת client (המפתחות ב-env של השרת;
 * החבילה server-only לא בפרויקט, אז ההגנה היא המוסכמה הזו).
 *
 * אחסון קישורי שיתוף קצרים - Supabase (REST, בלי תלות חדשה).
 *
 * טבלת shared_trips (ראו supabase-setup.sql בשורש הרפו): code (PK) ←
 * ה-payload המקודד של v1. שומרים את אותו base64url שהקישור הארוך נושא,
 * כך שהפענוח והאימות מול הדאטה האוצרת נשארים ב-decodeTripShare - נקודת
 * אמת אחת. בלי env (SUPABASE_URL + SUPABASE_ANON_KEY) הפיצ'ר כבוי
 * בשקט והקישור הארוך ממשיך לעבוד.
 *
 * כשיגיעו חשבונות משתמש: אותה טבלה מקבלת עמודת user_id והטיולים
 * נשמרים תחת החשבון - הקוד הקצר כבר ערוך לזה.
 */

import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; // בלי io01l

function randomCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    apikey: key!,
    'Content-Type': 'application/json',
  };
  // רק מפתחות anon בפורמט הישן הם JWT ונשלחים גם כ-Bearer; מפתחות
  // sb_publishable_ החדשים עוברים ב-apikey בלבד (Bearer עם ערך שאינו
  // JWT נדחה ע"י PostgREST).
  if (key!.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

export const shareStoreEnabled = () => Boolean(url && key);

/** שומר payload ומחזיר קוד קצר, או null אם האחסון לא מוגדר/נכשל */
export async function createShareCode(payload: string): Promise<string | null> {
  if (!shareStoreEnabled()) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode();
    try {
      const res = await fetch(`${url}/rest/v1/shared_trips`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
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

/** מאחזר payload לפי קוד קצר; null אם לא קיים או שהאחסון כבוי */
export async function getSharedPayload(code: string): Promise<string | null> {
  if (!shareStoreEnabled()) return null;
  if (!/^[a-zA-Z0-9]{6,12}$/.test(code)) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/shared_trips?${pgQuery(eq('code', code), pgSelect(['payload']), pgLimit(1))}`,
      { headers: headers(), next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { payload?: string }[];
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}
