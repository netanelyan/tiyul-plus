/**
 * שרת בלבד - לא לייבא מקומפוננטת client.
 *
 * הגבלת קצב ותקציב יומי, בלי תלות חדשה:
 *
 * 1. חלונות קבועים בזיכרון (checkLimit) - ההגנה המיידית מפרצים
 *    ומהצפה. בזיכרון של ה-instance: על שרת יחיד זה מדויק; ב-serverless
 *    כל instance סופר לעצמו - עדיין עוצר את דפוס ההצפה האמיתי (אלפי
 *    בקשות רצופות פוגעות באותו instance חם).
 * 2. תקציב יחידות AI יומי - בזיכרון תמיד, ואם מוגדר
 *    SUPABASE_SERVICE_ROLE_KEY גם נשמר ב-usage_daily (ראו
 *    supabase-premium.sql) כדי שהמכסה תחזיק גם על פני כמה instances
 *    וגם אחרי cold start. הקריאה הראשונה של יום/זהות ממזגת את הערך
 *    המרוחק פנימה (max), הכתיבה היא fire-and-forget דרך RPC אטומי.
 */

import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { serviceHeaders } from '@/lib/server/supabaseAdmin';

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

/** ניקוי עצלן - נקרא מדי פעם כדי שהמפה לא תגדל לנצח */
let lastPrune = 0;
function prune(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * חלון קבוע: עד max בקשות ל-windowMs, לפי (bucket, id). כל קריאה נספרת
 * (גם חסומה) - מציף שממשיך לנסות לא מתקדם לשום מקום.
 */
export function checkLimit(bucket: string, id: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  prune(now);
  const key = `${bucket}|${id}`;
  let e = windows.get(key);
  if (!e || e.resetAt <= now) {
    e = { count: 0, resetAt: now + windowMs };
    windows.set(key, e);
  }
  e.count += 1;
  return {
    ok: e.count <= max,
    remaining: Math.max(0, max - e.count),
    retryAfterSec: Math.ceil((e.resetAt - now) / 1000),
  };
}

/**
 * קריאה בלבד: כמה כבר נספר בחלון הפעיל, בלי לצרוך.
 *
 * קיים עבור מכסים שנספרים לפי **הצלחה** ולא לפי ניסיון - מכסת בניית
 * הטיולים המלאים של פרימיום. שם `checkLimit` הרגיל היה שורף אחת
 * מהבניות המותרות על כל ניסיון שנכשל בוולידציה, והמודל שמנסה שוב
 * באותו תור היה מבזבז את המכסה בלי שנבנה כלום. הדפוס: `peekUsed`
 * לפני הביצוע (חסימה בלי צריכה), `checkLimit` אחרי הצלחה (צריכה).
 */
export function peekUsed(bucket: string, id: string): number {
  const e = windows.get(`${bucket}|${id}`);
  if (!e || e.resetAt <= Date.now()) return 0;
  return e.count;
}

/** מפתח יום בזמן UTC - עקבי בין instances באזורים שונים */
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* ---------- תקציב יחידות AI יומי ---------- */

interface UsageEntry {
  day: string;
  units: number;
  /** האם כבר מוזג הערך מהאחסון המרוחק היום */
  merged: boolean;
}

const usage = new Map<string, UsageEntry>();

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistent = () => Boolean(supaUrl() && serviceKey());


function entryFor(id: string): UsageEntry {
  const day = dayKey();
  let e = usage.get(id);
  if (!e || e.day !== day) {
    e = { day, units: 0, merged: false };
    usage.set(id, e);
    if (usage.size > 20_000) usage.clear(); // הגנת זיכרון גסה - מתאפס, לא דולף
  }
  return e;
}

/** כמה יחידות AI נוצלו היום. ממזג את האחסון המרוחק בקריאה הראשונה של היום. */
export async function aiUnitsUsedToday(id: string): Promise<number> {
  const e = entryFor(id);
  if (!e.merged && persistent()) {
    e.merged = true; // גם בכישלון לא מנסים שוב כל בקשה - best effort
    try {
      const res = await fetch(
        `${supaUrl()}/rest/v1/usage_daily?${pgQuery(eq('identity', id), eq('day', e.day), pgSelect(['units']))}`,
        { headers: serviceHeaders(), signal: AbortSignal.timeout(3000) },
      );
      if (res.ok) {
        const rows = (await res.json()) as { units?: number }[];
        const remote = rows[0]?.units ?? 0;
        if (remote > e.units) e.units = remote;
      }
    } catch {
      /* אין אחסון מרוחק כרגע - הזיכרון המקומי ממשיך להגן */
    }
  }
  return e.units;
}

/** רישום שימוש אחרי קריאת מודל - מקומי מיד, מרוחק ברקע */
export function recordAiUnits(id: string, units: number): void {
  if (units <= 0) return;
  const e = entryFor(id);
  e.units += units;
  if (persistent()) {
    // RPC אטומי (insert on conflict update) - fire and forget
    fetch(`${supaUrl()}/rest/v1/rpc/bump_usage`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ p_identity: id, p_day: e.day, p_units: units }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
}

/** לבדיקות בלבד */
export function resetLimitsForTest(): void {
  windows.clear();
  usage.clear();
  lastPrune = 0;
}
