import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { dayDate } from '@/lib/trip/dates';
import { shabbatTimesFor, weekdayOf } from '@/lib/zmanim';
import { formatInZone, timezoneFor } from '@/lib/countryTimezones';

/**
 * A trip's Shabbat time rows - the computation shared by the "Shabbat and kashrut" panel and the
 * printed trip book. One source, so the two places cannot drift apart (the same rule as
 * dayDescription: a display is derived from one place).
 *
 * For every Friday falling within the trip's days: that evening's city, with candle-lighting and
 * havdala times computed astronomically for its coordinates, on the real local clock. A city with
 * no mapped time zone returns null in the time fields - and the UI says so honestly.
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
