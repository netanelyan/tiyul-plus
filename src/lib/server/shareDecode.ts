import { destinations } from '@/data/destinations';
import { fromBase64Url, type SharePayload, type SharedTrip } from '@/lib/trip/share';
import { safeDates } from '@/lib/trip/dates';

/**
 * Decoding a share code - **server side only**, because it validates against the full catalog.
 * See the explanation in `share.ts`: that separation is what lets the trip screen produce a
 * link without pulling the catalog into the bundle.
 */


export function decodeTripShare(code: string): SharedTrip | null {
  const json = fromBase64Url(code);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  // v1 and v2 both open: a code shared on WhatsApp months ago has to keep working, so the new
  // version **added** fields at the end rather than changing the existing ones.
  if (!Array.isArray(parsed) || (parsed[0] !== 1 && parsed[0] !== 2)) return null;
  const [, name, days, startDate, endDate] = parsed as SharePayload;
  if (typeof name !== 'string' || !Array.isArray(days)) return null;

  const cleanDays: SharedTrip['days'] = [];
  for (const d of days) {
    if (!Array.isArray(d) || typeof d[0] !== 'string' || !Array.isArray(d[1])) return null;
    const dest = destinations.find((x) => x.slug === d[0]);
    if (!dest) continue; // a city that does not exist in the catalog - skip it, do not invent
    // Only real place ids from the data - the iron rule applies to links too
    const placeIds = d[1].filter(
      (id): id is string => typeof id === 'string' && dest.places.some((p) => p.id === id),
    );
    cleanDays.push({
      citySlug: d[0],
      placeIds,
      notes: typeof d[2] === 'string' ? d[2].slice(0, 500) : undefined,
    });
  }
  if (cleanDays.length === 0) return null;
  return {
    name: name.slice(0, 80) || 'טיול משותף',
    days: cleanDays,
    ...safeDates({ startDate, endDate }),
  };
}
