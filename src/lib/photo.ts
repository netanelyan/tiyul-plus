/**
 * גזירת רוחב לתמונות ויקישיתוף, בזמן רינדור.
 *
 * **הכלל היחיד שחשוב כאן: רק להקטין.** ויקימדיה מגישה תמונה ממוזערת
 * צרה מהמקור, ולא רחבה ממנו - ולכן הרחבה מ-500 ל-960 מחזירה 404. זה
 * בדיוק הבאג שהפיל 170 כתובות בערך (k) ותועד בערך (q): "תמונה ממוזערת
 * צרה יותר תמיד קיימת; רחבה יותר - לא בהכרח". הפונקציה הזאת מסרבת
 * להרחיב, כך שהמחלקה הזאת של באגים לא יכולה לחזור דרכה.
 *
 * כתובות שאינן thumb של ויקישיתוף (Unsplash, למשל) חוזרות כמו שהן.
 */
const WIKI_THUMB = /^(https:\/\/upload\.wikimedia\.org\/\S*\/)(\d+)px-([^/]+)$/;

/** הרוחבים שהקטלוג מאמת מולם - ראו scripts/validate-catalog.mjs */
export type ThumbWidth = 250 | 330 | 500 | 960;

/** רוחב התמונה הממוזערת שהכתובת מבקשת כרגע, או null אם זו לא כתובת thumb */
export function thumbWidth(url: string): number | null {
  const m = url.match(WIKI_THUMB);
  return m ? Number(m[2]) : null;
}

export function thumb(url: string, width: ThumbWidth): string {
  const m = url.match(WIKI_THUMB);
  if (!m) return url;
  // אף פעם לא להרחיב - ראו ההסבר למעלה
  if (width >= Number(m[2])) return url;
  return `${m[1]}${width}px-${m[3]}`;
}

/**
 * srcSet מהרוחבים שקטנים מהמקור בלבד. הדפדפן בוחר לפי `sizes` ולפי
 * צפיפות המסך, כך שמסך רגיל מוריד 250/330 במקום 500 - ומסך צפוף עדיין
 * מקבל את המקור החד.
 */
export function thumbSrcSet(url: string, widths: ThumbWidth[] = [250, 330, 500]): string | undefined {
  const current = thumbWidth(url);
  if (current === null) return undefined;
  const usable = widths.filter((w) => w < current);
  if (usable.length === 0) return undefined;
  return [...usable.map((w) => `${thumb(url, w)} ${w}w`), `${url} ${current}w`].join(', ');
}
