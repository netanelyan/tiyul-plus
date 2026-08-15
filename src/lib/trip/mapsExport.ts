/**
 * ייצוא יום מהטיול לניווט ב-Google Maps.
 *
 * ## למה זה קובץ ולא שורה אחת
 *
 * הגרסה הקודמת בנתה `https://www.google.com/maps/dir/lat,lng/lat,lng/...`
 * בתוך הקומפוננטה. זה עובד ליום קטן ונשבר בשקט בשני מקרים אמיתיים:
 *
 * 1. **מספר העצירות.** הצורה המתועדת (`?api=1`) מקבלת מקור, יעד ועד
 *    **תשע** נקודות ביניים. יום עם 12 עצירות פשוט מאבד את העודף, בלי
 *    שאף אחד יידע - ומטייל שיוצא לדרך עם מסלול חסר הוא הכי גרוע שיש.
 *    לכן היום מפוצל לקטעים רצופים, וה-UI **אומר** שהוא פוצל.
 * 2. **אופן ההגעה.** בלי `travelmode` גוגל מנחש נהיגה, וזה לא נכון ליום
 *    רגלי במרכז עיר. נגזר מאותו נתון שכבר מניע את קטעי הנסיעה באתר -
 *    האם למטיילים יש רכב (`preferences.booking.car`).
 *
 * מה שלא נעשה: לא שולחים שמות מקומות. יש לנו קואורדינטות מאומתות בקטלוג,
 * ושם ("Café Central") עלול להיפתר אצל גוגל למקום אחר בעיר אחרת. ניווט
 * למקום הלא נכון גרוע מכתובת שנראית פחות יפה.
 */

/** נקודה לניווט - רק מה שצריך, כדי שאפשר יהיה להעביר גם סיכה וגם מקום */
export interface NavPoint {
  name: string;
  lat: number;
  lng: number;
}

/**
 * גוגל מקבלת עד תשע נקודות ביניים בין המקור ליעד, כלומר 11 נקודות בקטע.
 * המספר הזה מהתיעוד של Maps URLs ולא מניסוי.
 */
export const MAX_WAYPOINTS = 9;
export const MAX_POINTS_PER_LEG = MAX_WAYPOINTS + 2;

export type TravelMode = 'walking' | 'driving' | 'transit';

const coord = (p: NavPoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * נקודה שאפשר לנווט אליה בפועל - מספר סופי בטווח כדור הארץ. אותה
 * הגדרה בדיוק כמו `isUsableCoord` ב-`lib/outbound.ts`, כי "מספיק תקין
 * כדי לנווט אליו" הוא אותו קריטריון בשני המקומות. מיוצא כדי ש-
 * `DayNavExport` יוכל לדווח בכנות על נקודות שהודחו, במקום שהן ייעלמו
 * בשקט בתוך הפילטר של `googleMapsLegs`.
 */
export const isValidNavPoint = (p: NavPoint): boolean =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/** קישור ניווט אחד לרצף נקודות. מחזיר null אם אין לאן לנווט. */
export function googleMapsUrl(points: NavPoint[], mode: TravelMode = 'walking'): string | null {
  const valid = points.filter(isValidNavPoint);
  if (valid.length < 2) return null;
  const capped = valid.slice(0, MAX_POINTS_PER_LEG);
  const origin = capped[0];
  const destination = capped[capped.length - 1];
  const waypoints = capped.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: coord(origin),
    destination: coord(destination),
    travelmode: mode,
  });
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(coord).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface NavLeg {
  url: string;
  /** מספר הנקודות בקטע הזה, כולל המקור והיעד */
  count: number;
  from: string;
  to: string;
}

/**
 * מפצל יום לקטעי ניווט רצופים. הפיצול חופף בנקודה אחת: הקטע הבא מתחיל
 * במקום שבו הקודם נגמר, אחרת יש חור במסלול.
 */
export function googleMapsLegs(points: NavPoint[], mode: TravelMode = 'walking'): NavLeg[] {
  const valid = points.filter(isValidNavPoint);
  if (valid.length < 2) return [];
  const legs: NavLeg[] = [];
  let start = 0;
  while (start < valid.length - 1) {
    const chunk = valid.slice(start, start + MAX_POINTS_PER_LEG);
    const url = googleMapsUrl(chunk, mode);
    if (url) legs.push({ url, count: chunk.length, from: chunk[0].name, to: chunk[chunk.length - 1].name });
    if (chunk.length < MAX_POINTS_PER_LEG) break;
    start += MAX_POINTS_PER_LEG - 1; // חפיפה של נקודה אחת
  }
  return legs;
}

/**
 * אופן ההגעה מתוך ההעדפות. `car: 'have' | 'need'` פירושו שמתכננים עם
 * רכב - אותו נתון שקובע את קטעי הנסיעה בין ערים. אחרת יום עירוני הוא
 * הליכה, וזה גם מה שגוגל תציע להחליף בלחיצה אחת אם זה לא מתאים.
 */
export function travelModeFor(car: string | undefined): TravelMode {
  return car === 'have' || car === 'need' ? 'driving' : 'walking';
}
