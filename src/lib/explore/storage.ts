import type { ExploredDestination } from './resolver';

/**
 * צד לקוח: יעדים שנחקרו נשמרים מקומית (כמו הטיולים), כדי שהשלב הבא -
 * שילוב יעד ארעי בטיול ובסוכן - יעבוד על אותו מבנה. כשיגיעו חשבונות,
 * הקובץ הזה מוחלף בגיבוי שרת בדיוק כמו trip/storage.ts.
 */

const KEY = 'tiyul-plus:explored:v1';
const MAX = 20; // לא צוברים עולם שלם ב-localStorage

export function loadExplored(): ExploredDestination[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as ExploredDestination[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveExplored(dest: ExploredDestination): void {
  if (typeof window === 'undefined') return;
  try {
    const rest = loadExplored().filter((d) => d.slug !== dest.slug);
    window.localStorage.setItem(KEY, JSON.stringify([dest, ...rest].slice(0, MAX)));
  } catch {
    /* אחסון מלא - מוותרים בשקט */
  }
}
