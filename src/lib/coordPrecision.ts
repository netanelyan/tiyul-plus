/**
 * דיוק קואורדינטה - כמה ספרות עשרוניות באמת יש לה, ומה השגיאה שזה מרמז.
 *
 * ## למה זה קובץ נפרד מ-`outbound.ts`
 *
 * `outbound.ts` עונה על "יש קואורדינטה תקינה?" (מספר סופי בטווח כדור
 * הארץ) - שאלה בינארית שקובעת אם בכלל בונים קישור. השאלה כאן שונה:
 * "עד כמה אפשר לסמוך על הקואורדינטה שכן קיימת?" קואורדינטה עם שתי
 * ספרות עשרוניות (`45.66,14`) עוברת את הבדיקה הבינארית בקלות ועדיין
 * מטעה במטרים מאות עד קילומטר - בדיוק סוג הפער שקישור "עובד" מסתיר.
 *
 * המודול הזה משותף בין `scripts/coarse-coords.mjs` (worklist קריא
 * לבן-אדם) ובין `coordPrecision.test.ts` (רשת שמונעת מהפער הזה לגדול
 * בשקט) - כדי שהגדרת "גס" לא תתפצל לשני מקומות ותסטה זה מזה.
 *
 * ## למה הציר הגס קובע
 *
 * הדיוק של זוג נקבע ע"י הצלע החלשה: `45.66666793823242, 14` נראית
 * מדויקת עד שמסתכלים על הרכיב השני. הספרה הראשונה היא ארטיפקט של
 * float32, לא מדידה. לכן הדירוג הוא לפי `min(ספרות)`.
 *
 * שגיאה משוערת בקו הרוחב: 0 ספרות ~111 ק"מ, 1 ~11 ק"מ, 2 ~1.1 ק"מ.
 *
 * ## שדה גדול מול נקודה
 *
 * פארק לאומי או אגם הם שטח, ומרכז גס עבורם הוא לגיטימי. בית כנסת או
 * מסעדה הם נקודה, ושם קילומטר הוא ההבדל בין להגיע לבין לא. לכן כל
 * שורה מסומנת 'area' או 'point' - וזה מה שקובע אם היא באמת עבודה.
 */

/** קטגוריות שהן שטח ולא נקודה - מרכז גס עבורן סביר */
export const AREA_CATEGORIES = new Set(['nature', 'viewpoint']);

/** שגיאת ק"מ משוערת בקו הרוחב, לפי מספר הספרות העשרוניות (0/1/2) */
export const KM_ERROR_BY_DECIMALS = [111, 11, 1.1] as const;

/**
 * חיתוך ארטיפקטים של float32: `45.66666793823242` הוא בפועל 45.666667
 * שעבר עיגול כפול, ואין טעם לספור 14 ספרות משמעותיות שאיש לא מדד.
 */
export function coordDecimals(n: number): number {
  const s = String(n);
  const i = s.indexOf('.');
  if (i === -1) return 0;
  return Math.min(s.length - i - 1, 6);
}

export interface CoarsePlaceInput {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

export interface CoarseDestinationInput {
  slug: string;
  places?: CoarsePlaceInput[];
}

export interface CoarseCoordRow {
  destination: string;
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  /** min(ספרות lat, ספרות lng) */
  decimals: number;
  kmError: number;
  shape: 'area' | 'point';
}

/**
 * כל המקומות שהקואורדינטה שלהם גסה מ-`maxDecimals` ספרות עשרוניות
 * (כולל), ממוינים מהגס לעדין. `maxDecimals` תמיד 0/1/2 בפועל - מעבר
 * לזה `KM_ERROR_BY_DECIMALS` לא מוגדר.
 */
export function coarseCoordRows(destinations: CoarseDestinationInput[], maxDecimals = 2): CoarseCoordRow[] {
  const rows: CoarseCoordRow[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      const dec = Math.min(coordDecimals(p.lat), coordDecimals(p.lng));
      if (dec > maxDecimals) continue;
      rows.push({
        destination: d.slug,
        id: p.id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        decimals: dec,
        kmError: KM_ERROR_BY_DECIMALS[dec] ?? KM_ERROR_BY_DECIMALS[KM_ERROR_BY_DECIMALS.length - 1],
        shape: AREA_CATEGORIES.has(p.category) ? 'area' : 'point',
      });
    }
  }
  rows.sort((a, b) => a.decimals - b.decimals || a.destination.localeCompare(b.destination));
  return rows;
}
