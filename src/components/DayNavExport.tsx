'use client';

import {
  googleMapsLegs,
  isValidNavPoint,
  type NavPoint,
  type TravelMode,
  MAX_POINTS_PER_LEG,
} from '@/lib/trip/mapsExport';
import { trackEvent } from '@/lib/events';

/**
 * "ניווט ליום N ב-Google Maps" - העצירות של היום, לפי הסדר שבתכנון.
 *
 * שלוש החלטות שהן כל ההבדל בין הכפתור הזה לקישור שהיה כאן קודם:
 *
 * 1. **הוא אומר מה הוא עושה לפני שלוחצים** - כמה עצירות, ברגל או ברכב.
 *    כפתור שפותח אפליקציה אחרת חייב להיות צפוי.
 * 2. **יום ארוך מפוצל לקטעים, בגלוי.** גוגל מקבלת עד תשע נקודות ביניים,
 *    והגרסה הקודמת פשוט איבדה את העודף בשקט.
 * 3. **נקודת ההתחלה היא הלינה, אם יש** - ככה נראה יום אמיתי, ונאמר
 *    במפורש שהמסלול מתחיל מהמלון כדי שזה לא יהיה שינוי מפתיע.
 *
 * מובייל: כפתור מלא ברוחב עם גובה נגיעה אמיתי; ב-iOS ואנדרואיד הקישור
 * נפתח באפליקציית Maps עצמה. RTL רגיל - הטקסט עברי והכתובת בתוך ה-href.
 */
export default function DayNavExport({
  dayNumber,
  stops,
  start,
  mode,
}: {
  dayNumber: number;
  /** עצירות היום לפי הסדר */
  stops: NavPoint[];
  /** מקום הלינה בעיר הזו, אם יש לו מיקום מאומת */
  start?: NavPoint | null;
  mode: TravelMode;
}) {
  const points: NavPoint[] = start ? [start, ...stops] : stops;
  if (points.length === 0) return null;

  /*
    כמה נקודות באמת ייכנסו לניווט - `googleMapsLegs` מסננת קואורדינטה
    לא תקינה בשקט (`isValidNavPoint`), וזה בדיוק הבאג הזה בגרסה קטנה
    יותר: "5 נקודות" בכותרת כשרק 4 באמת נכנסו למסלול. אותה נקודה בדיוק
    כמו placeMapUrl - קישור/ניווט "עובד" שמשמיט עצירה בשקט גרוע מהודעה
    שאומרת זאת בגלוי.
  */
  const excluded = points.length - points.filter(isValidNavPoint).length;
  const legs = googleMapsLegs(points, mode);

  if (legs.length === 0) {
    /*
      שני מצבים שונים לגמרי מובילים לאותו legs.length === 0, וצריך
      להבדיל ביניהם: יום עם עצירה אחת בלבד (excluded === 0) הוא המצב
      הרגיל ביותר - אין ממה לבנות מסלול, ואין כאן שום דבר לדווח עליו.
      יום שבו עצירה כלשהי הודחה (excluded > 0) הוא כן פער דאטה שכדאי
      שיֵראה, לא שיעלם בדיוק כמו הכפתור שהיה נעלם קודם.
    */
    if (excluded === 0) return null;
    return (
      <p className="mt-3 text-center text-xs font-medium text-night/40">
        אין עדיין מספיק עצירות עם מיקום מאומת כדי לבנות ניווט ליום הזה
      </p>
    );
  }

  const modeLabel = mode === 'driving' ? 'ברכב' : 'ברגל';
  const navigable = points.length - excluded;
  const summary = `${navigable} נקודות · ${modeLabel}${start ? ' · מתחיל מהלינה' : ''}`;
  const excludedNote =
    excluded > 0
      ? ` · ${excluded} ${excluded === 1 ? 'עצירה אחת לא נכללה' : 'עצירות לא נכללו'} כי אין להן מיקום מאומת`
      : '';

  return (
    <div className="mt-3">
      {legs.length === 1 ? (
        <a
          href={legs[0].url}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent('maps')}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-night/5 px-4 py-2.5 text-center text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night"
        >
          <span aria-hidden>🧭</span> ניווט ליום {dayNumber} ב-Google Maps
        </a>
      ) : (
        <div className="space-y-1.5">
          {legs.map((leg, i) => (
            <a
              key={leg.url}
              href={leg.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('maps')}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-night/5 px-4 py-2.5 text-center text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night"
            >
              <span aria-hidden>🧭</span> ניווט · קטע {i + 1} מתוך {legs.length}
              <span className="font-medium text-night/45">({leg.count} נקודות)</span>
            </a>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-center text-xs font-medium text-night/40">
        {legs.length === 1
          ? `${summary}${excludedNote}`
          : `${summary} · Google Maps מגבילה ${MAX_POINTS_PER_LEG} נקודות בניווט אחד, ולכן היום מחולק לקטעים רצופים${excludedNote}`}
      </p>
    </div>
  );
}
