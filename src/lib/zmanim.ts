/**
 * זמני שקיעה, הדלקת נרות וצאת שבת - **אסטרונומיה טהורה, אפס תלויות.**
 *
 * ## למה זה בטוח לחשב ולא "המצאה"
 *
 * חוק ברזל 2 אוסר להמציא עובדות - אבל שקיעה בקואורדינטה ותאריך נתונים
 * היא לא עובדה שאוספים, היא חישוב דטרמיניסטי (NOAA solar position,
 * אותו אלגוריתם שכל לוח זמנים משתמש בו). הקטלוג כבר נושא קואורדינטות
 * מאומתות לכל עיר, והטיול נושא תאריכים - שני הקלטים קיימים ואמינים.
 *
 * ## מה זה במפורש לא
 *
 * לא פסיקה הלכתית. הדלקת נרות מוצגת לפי המנהג הרווח (18 דקות לפני
 * השקיעה; ירושלים נוהגת 40 אך אינה יעד בקטלוג), וצאת השבת לפי 8.5
 * מעלות מתחת לאופק - מנהג נפוץ, לא היחיד. ה-UI מציג את זה עם הסתייגות
 * קבועה ("מנהגים משתנים - בדקו עם הרב שלכם"), באותה רוח שבה כל תג
 * כשרות באתר נושא "לוודא מול המקום".
 *
 * ## דיוק
 *
 * אלגוריתם NOAA מדויק לסדר גודל של דקה בטווח קווי הרוחב של הקטלוג.
 * בקווי רוחב קיצוניים (שמש חצות/לילה קוטבי) אין שקיעה - מוחזר null
 * ולא ערך מומצא, כרגיל בפרויקט הזה: השמטה עדיפה על קירוב.
 */

const RAD = Math.PI / 180;

/** יום יוליאני מ-ISO date (חצות UTC) */
function julianDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

/**
 * זמן חציית השמש את הזווית הנתונה מתחת לאופק, בירידה (ערב), כ-Date
 * אמיתי (UTC). `angleDeg` = 0.833 לשקיעה נראית (רפרקציה + רדיוס השמש),
 * 8.5 לצאת שבת. מחזיר null כשהשמש לא מגיעה לזווית הזו באותו יום.
 *
 * NOAA sunrise/sunset algorithm - הצורה המקובלת, מיושמת ישירות.
 */
export function sunCrossing(iso: string, lat: number, lng: number, angleDeg: number): Date | null {
  const jd = julianDay(iso);
  const n = jd - 2451545 + 0.0008;
  const jStar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDecl = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDecl = Math.cos(Math.asin(sinDecl));
  const cosHour =
    (Math.sin(-angleDeg * RAD) - Math.sin(lat * RAD) * sinDecl) /
    (Math.cos(lat * RAD) * cosDecl);
  if (cosHour < -1 || cosHour > 1) return null; // אין חצייה ביום הזה (קוטבי)
  const hourAngle = Math.acos(cosHour) / RAD;
  const jSet = jTransit + hourAngle / 360;
  // יום יוליאני → epoch ms: היום היוליאני נספר מצהרי UTC
  return new Date((jSet - 2440587.5) * 86400_000);
}

/** שקיעה נראית (0.833 מעלות - רפרקציה סטנדרטית + חצי קוטר השמש) */
export const sunset = (iso: string, lat: number, lng: number) => sunCrossing(iso, lat, lng, 0.833);

export interface ShabbatTimes {
  /** תאריך יום שישי (ISO) */
  friday: string;
  /** הדלקת נרות: 18 דקות לפני השקיעה של יום שישי */
  candles: Date;
  /** צאת השבת: 8.5 מעלות מתחת לאופק במוצ"ש - מנהג נפוץ, לא פסיקה */
  havdalah: Date;
}

/** ISO של היום שאחרי */
function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/** 0=ראשון .. 5=שישי, 6=שבת - לפי הלוח האזרחי של התאריך עצמו */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * זמני השבת שחלה בתאריך נתון, אם הוא שישי או שבת - לפי מיקום נתון.
 * מחזיר null כשהתאריך אינו שישי/שבת או כשאין שקיעה חישובית במקום.
 */
export function shabbatTimesFor(iso: string, lat: number, lng: number): ShabbatTimes | null {
  const dow = weekdayOf(iso);
  const friday = dow === 5 ? iso : dow === 6 ? prevDay(iso) : null;
  if (!friday) return null;
  const fridaySunset = sunset(friday, lat, lng);
  const satNight = sunCrossing(nextDay(friday), lat, lng, 8.5);
  if (!fridaySunset || !satNight) return null;
  return {
    friday,
    candles: new Date(fridaySunset.getTime() - 18 * 60_000),
    havdalah: satNight,
  };
}

function prevDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/*
  אין כאן פונקציית "שעה מקומית משוערת" מקו אורך, בכוונה: קירוב כזה
  מחמיץ שעון קיץ בשעה שלמה, וכשמדובר בזמן הדלקת נרות זו לא טעות
  קוסמטית. השעון המקומי האמיתי מגיע מ-lib/countryTimezones.ts (מיפוי
  מדינה→אזור IANA + Intl), וכשאין שם תשובה - לא מציגים זמן בכלל.
*/
