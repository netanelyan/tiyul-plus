'use client';

import { useEffect } from 'react';
import { pingVisit } from '@/lib/events';

/**
 * מונה הביקורים החוזרים - רכיב בלתי-נראה שיושב ב-layout, כמו
 * `AccountSync`. כל ההיגיון (מתי ביקור נחשב "חוזר", דדופ פעם-ביום,
 * דפדפנים ותיקים מלפני הפיצ'ר) חי ב-`lib/events.ts#pingVisit` כדי
 * שיהיה מקום אחד לקרוא בו את הכללים.
 *
 * StrictMode מריץ אפקטים פעמיים בפיתוח - `pingVisit` אידמפוטנטי בתוך
 * אותו יום (הריצה הראשונה רושמת counted=today, השנייה רואה ושותקת),
 * אז אין ספירה כפולה גם שם.
 */
export default function VisitPing() {
  useEffect(() => {
    pingVisit();
  }, []);
  return null;
}
