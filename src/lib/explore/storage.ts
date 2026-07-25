import type { Destination } from '@/lib/types';
import { isExploredSlug } from './adapter';

/**
 * צד לקוח: יעדים שנחקרו (בצורת Destination מלאה, כפי שהשרת שידר אותם
 * באירוע {type:'explored'}) נשמרים מקומית וגם נשלחים חזרה לשרת בכל תור
 * שיחה, כדי שהסוכן ימשיך לתקף מולם טיולים שנבנו בהם. כשיגיעו חשבונות,
 * הקובץ הזה מוחלף בגיבוי שרת בדיוק כמו trip/storage.ts.
 */

const KEY = 'tiyul-plus:explored:v2';
const MAX = 6; // גם תקרת השרת (sanitizeExploredDestinations)

export function loadExplored(): Destination[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Destination[]) : [];
    return Array.isArray(arr) ? arr.filter((d) => d && isExploredSlug(String(d.slug))) : [];
  } catch {
    return [];
  }
}

export function saveExplored(dest: Destination): Destination[] {
  if (typeof window === 'undefined') return [];
  const next = [dest, ...loadExplored().filter((d) => d.slug !== dest.slug)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* אחסון מלא - נשארים עם מה שבזיכרון */
  }
  return next;
}
