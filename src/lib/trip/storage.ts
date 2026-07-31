import type { Trip } from './types';

/**
 * שכבת אחסון דקה מעל localStorage.
 * כשיהיה backend אמיתי (חשבונות משתמש), מחליפים רק את הקובץ הזה -
 * הקומפוננטות מדברות עם TripContext ולא יודעות איפה הנתונים גרים.
 */

const KEY = 'tiyul-plus:trips:v1';

/**
 * מצבות (tombstones): מתי כל טיול נמחק.
 *
 * **למה זה חייב להיות כאן ולא רק "השורה נעלמה".** כל שינוי אחר בטיול נושא
 * `updatedAt`, ולכן המיזוג עם החשבון יודע להכריע "המאוחר מנצח". מחיקה, לעומת
 * זאת, התבטאה עד היום רק בהיעדר - ולהיעדר אין חותמת. כל עותק מרוחק, גם מ-
 * snapshot שנקרא רגע לפני המחיקה, "ניצח" את המחיקה והחזיר את הטיול לחיים.
 * זה הבאג שנתנאל דיווח עליו: מוחקים, מרעננים, והטיול חוזר.
 */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_TOMBSTONES = 200;

export interface TripState {
  trips: Trip[];
  currentId: string | null;
  /** id של טיול שנמחק → מתי (ms). נגזם לפי גיל ולפי מספר. */
  deleted?: Record<string, number>;
  /**
   * **של מי הנתונים שיושבים כאן עכשיו.** `null` = אנונימי (טיולים שנבנו
   * בלי חשבון), מחרוזת = ה-uuid של החשבון שממנו הם נמשכו.
   *
   * זה לא מטא-דאטה: בלי השדה הזה, מכשיר משותף מערבב אנשים. היציאה
   * מהחשבון לא ניקתה את האחסון, ולכן ההתחברות הבאה מיזגה את הטיולים של
   * הקודם לתוך החשבון החדש - `mergeTrips` דוחפת כל טיול מקומי שאינו
   * בשרת, וזו בדיוק הצורה של "טיול מקומי שאינו בשרת". ראו `AccountSync`.
   */
  accountId?: string | null;
}

const EMPTY: TripState = { trips: [], currentId: null, deleted: {}, accountId: null };

/** גזימה: מצבה בת 90 יום אין לה מה להגן עליו, ורשימה בלי תקרה גדלה לנצח. */
export function pruneTombstones(
  deleted: Record<string, number> | undefined,
  now = Date.now(),
): Record<string, number> {
  if (!deleted) return {};
  const fresh = Object.entries(deleted)
    .filter(([, at]) => typeof at === 'number' && Number.isFinite(at) && now - at < TOMBSTONE_TTL_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOMBSTONES);
  return Object.fromEntries(fresh);
}

export function loadTrips(): TripState {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as TripState;
    if (!Array.isArray(parsed.trips)) return { ...EMPTY };
    return { ...parsed, deleted: pruneTombstones(parsed.deleted), accountId: parsed.accountId ?? null };
  } catch {
    return { ...EMPTY };
  }
}

export function saveTrips(state: TripState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...state, deleted: pruneTombstones(state.deleted) }),
    );
  } catch {
    // אחסון מלא/חסום - מתעלמים בשקט, המצב נשאר בזיכרון
  }
}
