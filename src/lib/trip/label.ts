import type { Trip } from './types';

/**
 * כותרת קצרה לטיול לפי הערים בו - "וינה" ליעד יחיד, "ברטיסלבה + וינה"
 * למספר ערים.
 *
 * **הפונקציה מקבלת מפת שמות ולא מייבאת את הקטלוג, וזאת הסיבה:** היא
 * נקראת מתוך `SiteNav`, שיושב ב-layout ולכן קיים בכל עמוד באתר. הייבוא
 * `import { destinations }` שהיה כאן גרר את כל הקטלוג (2MB, 492kB דחוס)
 * אל ה-bundle המשותף - **בכל דף, כולל דף הבית ודפי היעדים שלא נוגעים בו
 * בכלל** - בשביל תרגום slug לשם עיר. נמדד: זה היה כ-60% מכלל ה-JS באתר.
 *
 * המפה נבנית בשרת (`cityNames()` ב-`@/lib/server/cityNames`) ויורדת
 * כ-props: כמה קילובייטים, ותמיד מסונכרנת עם הקטלוג כי היא נגזרת ממנו.
 * קובץ מיוצר ומקומט היה חוסך עוד קצת ומתיישן בשקט בכל פעם שסשן הדאטה
 * מוסיף עיר - וזו החלפה גרועה.
 */
export type CityNames = Record<string, string>;

export function tripLabel(trip: Trip, names: CityNames): string {
  const found = trip.citySlugs.map((slug) => names[slug]).filter((n): n is string => Boolean(n));
  if (found.length === 0) return trip.name || 'טיול';
  if (found.length === 1) return found[0];
  return `${found[0]} + ${found[found.length - 1]}`;
}
