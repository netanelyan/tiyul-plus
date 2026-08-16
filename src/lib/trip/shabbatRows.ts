import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { dayDate } from '@/lib/trip/dates';
import { shabbatTimesFor, weekdayOf } from '@/lib/zmanim';
import { formatInZone, timezoneFor } from '@/lib/countryTimezones';

/**
 * שורות זמני השבת של טיול - החישוב המשותף לפאנל "שבת וכשרות" ולספר
 * הטיול המודפס. מקור אחד, כדי ששני המקומות לא יסטו זה מזה (אותו כלל
 * כמו dayDescription: תצוגה נגזרת ממקום אחד).
 *
 * לכל שישי שנופל בימי הטיול: העיר של אותו ערב, זמני נרות/הבדלה
 * מחושבים אסטרונומית לקואורדינטות שלה, בשעון המקומי האמיתי. עיר בלי
 * אזור זמן ממופה מחזירה null בשדות הזמן - וה-UI אומר זאת בכנות.
 */
export interface ShabbatRow {
  fridayIso: string;
  dayNumber: number;
  cityName: string;
  candles: string | null;
  havdalah: string | null;
}

export function shabbatRowsFor(
  trip: Trip,
  destOf: (slug: string) => Destination | undefined,
): ShabbatRow[] {
  if (!trip.startDate) return [];
  const rows: ShabbatRow[] = [];
  trip.days.forEach((d, i) => {
    const iso = dayDate(trip, i);
    if (!iso || weekdayOf(iso) !== 5) return;
    const dest = destOf(d.citySlug);
    if (!dest) return;
    const times = shabbatTimesFor(iso, dest.center.lat, dest.center.lng);
    if (!times) return;
    const zone = timezoneFor(dest.countrySlug, dest.center.lng);
    rows.push({
      fridayIso: iso,
      dayNumber: i + 1,
      cityName: dest.name,
      candles: zone ? formatInZone(times.candles, zone) : null,
      havdalah: zone ? formatInZone(times.havdalah, zone) : null,
    });
  });
  return rows;
}
