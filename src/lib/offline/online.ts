'use client';

import { useEffect, useState } from 'react';

/**
 * האם יש חיבור לרשת.
 *
 * `navigator.onLine` הוא **סימן ולא הוכחה**: הדפדפן מדווח true גם
 * כשיש חיבור ל-WiFi בלי אינטרנט בכלל. עבור הפיצ׳ר הזה זה בסדר, כי
 * מה שהוא מפעיל הוא הצגת מצב וכיבוי פקדים - לא החלטה הרסנית. הכיוון
 * החשוב מדויק: `false` פירושו כמעט תמיד שבאמת אין רשת, וזה הרגע
 * שבו המשתמש עומד ברחוב וצריך לראות את המסלול.
 *
 * מתחיל תמיד ב-`true`: השרת לא יודע, ואתחול מ-`navigator` היה יוצר
 * אי-התאמת hydration - אותה מלכודת שכבר תועדה כאן ב-PromptChips.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    // גיבוי: מכשירים ניידים לא תמיד יורים את האירועים אחרי חזרה
    // מרדמה, ובדיקה בכל חזרה למסך מחזירה את המצב לאמת בלי רענון.
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return online;
}

/** נוסח אחיד לכל פקד שכובה בגלל היעדר רשת (title + aria-label) */
export const OFFLINE_HINT = 'אין חיבור לאינטרנט - הפעולה הזאת דורשת חיבור';

/**
 * חותמת זמן (ms) → `YYYY-MM-DD` **מקומי**, כדי להזין את
 * `formatHebrewDate`. הבנייה היא מהשדות המקומיים ולא מ-`toISOString`,
 * שהוא UTC: מטייל שנמצא ממערב לגריניץ׳ היה רואה את התוכן שלו מתוארך
 * יום אחורה - בדיוק המלכודת שתועדה כבר ב-`dates.ts`.
 */
export function isoDay(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
