/**
 * חשבון מדדי הצמיחה - קובץ משותף (שרת מגיש שורות, הלקוח מחשב טווחים),
 * טהור ולכן נבדק ביחידה. ההפרדה מכוונת: הנתיב מחזיר את שורות
 * `app_events` כמו שהן, והחלפת טווח (7/30/הכול) היא חישוב מקומי בלי
 * עוד בקשה - הטבלה קטנה (שורה ליום לכל סוג).
 */

export interface EventRow {
  day: string; // YYYY-MM-DD (UTC, כמו dayKey בשרת)
  kind: string;
  count: number;
}

export type GrowthRange = 7 | 30 | 'all';

/**
 * ששת המדדים שנתנאל ביקש. `kinds` הוא רשימת סוגי האירועים שנסכמים
 * לאותו מדד - "שיתופים" הם גם העתקת קישור וגם וואטסאפ, כי שניהם
 * מייצרים קישור שיתוף.
 */
export const GROWTH_METRICS = [
  { key: 'trips', label: 'טיולים שנוצרו', kinds: ['trip_created'] },
  { key: 'shares', label: 'קישורי שיתוף שנוצרו', kinds: ['share', 'whatsapp'] },
  { key: 'opens', label: 'פתיחות של קישור משותף', kinds: ['shared_open'] },
  { key: 'adopts', label: 'צפייה בשיתוף שהפכה לטיול', kinds: ['shared_adopt'] },
  { key: 'emails', label: 'הרשמות לרשימת התפוצה', kinds: ['newsletter'] },
  { key: 'returns', label: 'ביקורים חוזרים', kinds: ['return_visit'] },
] as const;

export type GrowthKey = (typeof GROWTH_METRICS)[number]['key'];

export interface GrowthValue {
  current: number;
  /** הטווח המקביל הקודם (7 הימים שלפני 7 הימים האחרונים) - null ב"הכול" */
  previous: number | null;
}

/** הפרש ימים שלמים בין שני תאריכי ISO, לפי חצות UTC */
export function daysBetween(laterIso: string, earlierIso: string): number {
  const later = Date.parse(laterIso);
  const earlier = Date.parse(earlierIso);
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return Number.NaN;
  return Math.round((later - earlier) / 86_400_000);
}

/**
 * הסכומים לכל מדד בטווח המבוקש, ולידם הטווח המקביל הקודם.
 *
 * חלון נוכחי: `0 <= diff < N` (כולל היום). חלון קודם: `N <= diff < 2N`.
 * שורה עם תאריך עתידי (הסטת שעון בין שרתים) נספרת בנוכחי - עדיף
 * לספור אותה מאשר להעלים אותה.
 */
export function computeGrowth(
  rows: EventRow[],
  todayIso: string,
  range: GrowthRange,
): Record<GrowthKey, GrowthValue> {
  const kindToKey = new Map<string, GrowthKey>();
  for (const m of GROWTH_METRICS) for (const k of m.kinds) kindToKey.set(k, m.key);

  const out = {} as Record<GrowthKey, GrowthValue>;
  for (const m of GROWTH_METRICS) out[m.key] = { current: 0, previous: range === 'all' ? null : 0 };

  for (const r of rows) {
    const key = kindToKey.get(r.kind);
    if (!key) continue; // סוגי הייצוא הישנים (print/maps...) לא שייכים לכאן
    const n = Number(r.count) || 0;
    if (n <= 0) continue;
    if (range === 'all') {
      out[key].current += n;
      continue;
    }
    const diff = daysBetween(todayIso, r.day);
    if (!Number.isFinite(diff)) continue;
    if (diff < range) out[key].current += n;
    else if (diff < range * 2) out[key].previous = (out[key].previous ?? 0) + n;
  }
  return out;
}

/** האם אי-פעם נספר אירוע צמיחה - ההבדל בין "שבוע שקט" ל"פונקציה ישנה" */
export function growthEverCounted(rows: EventRow[]): boolean {
  const growthKinds = new Set<string>(GROWTH_METRICS.flatMap((m) => [...m.kinds]));
  // share/whatsapp הם סוגים ותיקים שנספרו עוד לפני הפיצ'ר - הם לא
  // מעידים שהרשימה הסגורה של bump_event עודכנה. רק הסוגים החדשים כן.
  growthKinds.delete('share');
  growthKinds.delete('whatsapp');
  return rows.some((r) => growthKinds.has(r.kind) && Number(r.count) > 0);
}
