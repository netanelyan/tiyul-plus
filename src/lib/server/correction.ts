/**
 * ---------- "ברצלונה, לא ברטיסלבה" ----------
 *
 * נתנאל תיקן את הסוכן, והסוכן **יצר טיול שני** והשאיר את הראשון ברשימה.
 * הכלל שהוא ניסח הוא כללי ולא על ערים: *אם התור הקודם יצר או שינה משהו
 * והתור הזה מתקן אותו - התיקון חל על אותו דבר.*
 *
 * ## למה זה קובץ ולא סעיף בפרומפט
 *
 * הסיבה הישירה לבאג היא שורה אחת ב-`agent.ts`: `create_trip_full` מייצר
 * `id: newId()` תמיד, ולכן `upsertTrip` בלקוח **מוסיף** במקום להחליף.
 * שום ניסוח בפרומפט לא משנה את זה. הזיהוי כאן הוא דטרמיניסטי, נבדק
 * ביחידות, וההשלכה שלו היא מבנית: בתור של תיקון, בנייה מחדש שומרת את
 * מזהה הטיול הפתוח.
 *
 * ## הכיוון הבטוח לטעות
 *
 * הכלל **לא** הפוך: בנייה שאיננה תיקון ממשיכה ליצור טיול חדש, בדיוק
 * כמו היום. זה מכוון. תיקון שנחשב בטעות לבקשה חדשה עולה טיול מיותר
 * שאפשר למחוק; בקשה חדשה שנחשבת בטעות לתיקון **דורסת טיול קיים**, וזה
 * אובדן מידע. לכן הסימנים למטה מפורשים, ושלושת התנאים חייבים להתקיים
 * יחד.
 */

import type { Trip } from '@/lib/trip/types';

/**
 * ניסוחי תיקון מפורשים. כולם אומרים "מה שקרה עכשיו אינו מה שרציתי".
 *
 * `שלילה + חלופה` ("ברצלונה, לא ברטיסלבה" / "לא רומא, מילאנו") מטופלת
 * בנפרד למטה, כי "לא" לבדה מופיעה בהמון משפטים תמימים ("לא צריך מלון").
 */
const EXPLICIT =
  /התכוונתי|התכוונו|לא התכוונתי|טעות|טעיתי|התבלבל|תיקון[:\s]|לא נכון|לא ביקשתי|לא רציתי|לא זה|זה לא מה|לא ככה|במקום ה?זה|אמרתי ל?|כתבתי ל?|שיניתי את דעתי/;

/**
 * שלילה של משהו + חלופה באותה נשימה. הצורה שנתנאל כתב בפועל.
 *
 * דורש פסיק או "אלא"/"ולא"/"לא" בין שני שמות - כלומר מבנה של החלפה,
 * ולא סתם המילה "לא".
 */
const NEGATED_ALTERNATIVE =
  /[^,]{2,30},\s*(?:ו?לא|אלא לא)\s+\S{2,}|(?:^|\s)לא\s+\S{2,30},\s*\S{2,}|\s(?:אלא|ולא)\s+\S{2,}/;

export interface CorrectionVerdict {
  correction: boolean;
  /** לוג ולסיכום - איזה סימן הכריע */
  why: string;
}

/**
 * האם ההודעה הזאת מתקנת את התור הקודם.
 *
 * שלושה תנאים, כולם חובה:
 *
 * 1. **יש טיול פעיל.** בלי משהו קיים אין מה לתקן.
 * 2. **ההודעה הקודמת היא של הסוכן.** תיקון מתייחס לתשובה, ולכן אחרי
 *    הודעת משתמש שלא נענתה אין למה להתייחס.
 * 3. **יש ניסוח תיקון מפורש**, או שלילה עם חלופה.
 *
 * ההודעה גם חייבת להיות קצרה יחסית: תיקון הוא משפט. פסקה שמתחילה
 * ב"טעיתי" וממשיכה לבקשה חדשה לגמרי היא בקשה חדשה.
 */
export function detectCorrection(
  messages: { role: string; content: string }[],
  trip: Trip | null,
): CorrectionVerdict {
  if (!trip || trip.days.length === 0) return { correction: false, why: 'אין טיול פעיל' };
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') return { correction: false, why: 'אין הודעת משתמש' };
  const prev = messages[messages.length - 2];
  if (!prev || prev.role !== 'assistant') return { correction: false, why: 'התור הקודם אינו של הסוכן' };

  const text = (last.content ?? '').trim();
  if (!text) return { correction: false, why: 'הודעה ריקה' };
  if (text.length > 200) return { correction: false, why: `הודעה ארוכה (${text.length})` };

  if (EXPLICIT.test(text)) return { correction: true, why: 'ניסוח תיקון מפורש' };
  if (NEGATED_ALTERNATIVE.test(text)) return { correction: true, why: 'שלילה עם חלופה' };
  return { correction: false, why: 'לא זוהה תיקון' };
}

/**
 * ההנחיה שנשלחת למודל בתור של תיקון, בבלוק האחרון של ה-system.
 *
 * המשפט המקביל בתוצאת הכלי יושב ב-`agent.ts` עצמו ולא כאן - `agent.ts`
 * נטען גם בדפדפן, ואין סיבה לגרור אליו מודול שרת בשביל מחרוזת.
 */
export const CORRECTION_INSTRUCTION =
  'CORRECTION TURN - the server detected that this message corrects the previous turn, not that it starts something new. ' +
  'Apply the fix to the thing that already exists: edit the open trip, do not create a second one beside it. ' +
  'Prefer the narrow tools (set_day_city + set_day_places, move_day, rename_trip); if you do rebuild with create_trip_full it will replace the open trip rather than add one. ' +
  'Say in one short Hebrew sentence that you fixed the existing trip.';
