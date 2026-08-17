/**
 * Sunset, candle-lighting and Shabbat-end times - **pure astronomy, zero dependencies.**
 *
 * ## Why this is safe to compute and not "fabrication"
 *
 * Hard rule 2 forbids inventing facts - but sunset at a given coordinate and
 * date is not a fact one collects, it is a deterministic computation (NOAA
 * solar position, the same algorithm every timetable uses). The catalog
 * already carries verified coordinates for every city, and the trip carries
 * dates - both inputs exist and are trustworthy.
 *
 * ## What this explicitly is not
 *
 * Not a halachic ruling. Candle lighting is shown per the prevailing custom
 * (18 minutes before sunset; Jerusalem practices 40 but is not a catalog
 * destination), and Shabbat end per 8.5 degrees below the horizon - a common
 * custom, not the only one. The UI shows this with a standing disclaimer
 * ("customs vary - check with your rabbi"), in the same spirit in which every
 * kosher badge on the site carries "verify with the venue".
 *
 * ## Accuracy
 *
 * The NOAA algorithm is accurate to the order of a minute within the
 * catalog's latitude range. At extreme latitudes (midnight sun / polar night)
 * there is no sunset - null is returned rather than an invented value, as
 * usual in this project: omission beats approximation.
 */

const RAD = Math.PI / 180;

/** Julian day from an ISO date (midnight UTC) */
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
 * The time the sun crosses the given angle below the horizon, descending
 * (evening), as a real Date (UTC). `angleDeg` = 0.833 for apparent sunset
 * (refraction + solar radius), 8.5 for Shabbat end. Returns null when the sun
 * does not reach that angle on that day.
 *
 * NOAA sunrise/sunset algorithm - the standard form, implemented directly.
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
  if (cosHour < -1 || cosHour > 1) return null; // no crossing on this day (polar)
  const hourAngle = Math.acos(cosHour) / RAD;
  const jSet = jTransit + hourAngle / 360;
  // Julian day → epoch ms: the Julian day is counted from noon UTC
  return new Date((jSet - 2440587.5) * 86400_000);
}

/** Apparent sunset (0.833 degrees - standard refraction + half the sun's diameter) */
export const sunset = (iso: string, lat: number, lng: number) => sunCrossing(iso, lat, lng, 0.833);

export interface ShabbatTimes {
  /** The Friday date (ISO) */
  friday: string;
  /** Candle lighting: 18 minutes before Friday's sunset */
  candles: Date;
  /** Shabbat end: 8.5 degrees below the horizon on Saturday night - a common custom, not a ruling */
  havdalah: Date;
}

/** ISO of the following day */
function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/** 0=Sunday .. 5=Friday, 6=Saturday - per the civil calendar of the date itself */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The times of the Shabbat that falls on a given date, if it is Friday or
 * Saturday - for a given location. Returns null when the date is not
 * Friday/Saturday or when there is no computable sunset at the location.
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
  There is no "estimated local time" function derived from longitude here, on
  purpose: such an approximation misses daylight saving by a whole hour, and
  when it comes to candle-lighting time that is not a cosmetic error. The
  real local clock comes from lib/countryTimezones.ts (country→IANA zone
  mapping + Intl), and when there is no answer there - no time is shown at
  all.
*/
