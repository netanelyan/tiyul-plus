// בניית כתובת תמונה ממוזערת של ויקימדיה משם הקובץ בלבד.
//
// למה זה בטוח ולא ניחוש: הנתיב ב-upload.wikimedia.org נגזר דטרמיניסטית
// מ-md5 של שם הקובץ (עם קווים תחתונים במקום רווחים) - התו הראשון של
// ה-hash, ואז שני התווים הראשונים. המימוש כאן נבדק מול 611 הכתובות
// שכבר קיימות בדאטה ושכולן אומתו בעבר ברשת: 609 שוחזרו תו-בתו. שתי
// היוצאות דופן היו קבצי SVG, שדורשים סיומת png נוספת - ולכן SVG נפסל
// כאן ממילא (הוא כמעט תמיד לוגו, דגל או מפה, כלומר הנושא הלא נכון).
import { createHash } from 'node:crypto';

/** תווים ש-encodeURIComponent משאיר אבל מדיה-ויקי מקודדת */
const EXTRA = /[!'()*]/g;

export function encodeFileName(file) {
  const name = file.replace(/ /g, '_');
  return encodeURIComponent(name).replace(EXTRA, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * @param {string} file שם הקובץ ב-Commons, בלי התחילית File:
 * @param {number} width רוחב הממוזערת (הדאטה משתמשת ב-500)
 * @returns {string|null} null אם הקובץ אינו סוג תמונה שמתאים לנו
 */
export function commonsThumb(file, width = 500) {
  if (!file || /\.svg$/i.test(file)) return null;
  if (!/\.(jpe?g|png|webp|tiff?)$/i.test(file)) return null;
  const name = file.replace(/ /g, '_');
  const hash = createHash('md5').update(name, 'utf8').digest('hex');
  const enc = encodeFileName(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${enc}/${width}px-${enc}`;
}

/** שמות קבצים שכמעט תמיד אינם תמונה של המקום עצמו */
export const BAD_FILE = /(flag|coat[_ ]of[_ ]arms|logo|map[_ ]of|locator|seal|emblem|blank|wappen|\bmap\b|diagram|plan[_ ]of)/i;
