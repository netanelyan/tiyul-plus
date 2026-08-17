import type { Destination } from '@/lib/types';
import type { Trip, TripDay } from './types';
import { newId } from './types';

/**
 * A trip from an imported destination (Google My Maps): all the points in the order of the original
 * map, up to 4 stops per day. Shared by the import modal in the trip workspace and the link tab in
 * /start.
 */
export const IMPORT_STOPS_PER_DAY = 4;

export function buildTripFromImport(dest: Destination): Trip {
  const days: TripDay[] = [];
  for (let i = 0; i < dest.places.length; i += IMPORT_STOPS_PER_DAY) {
    days.push({
      id: newId(),
      citySlug: dest.slug,
      placeIds: dest.places.slice(i, i + IMPORT_STOPS_PER_DAY).map((p) => p.id),
    });
  }
  return {
    id: newId(),
    name: dest.name,
    citySlugs: [dest.slug],
    days,
    createdAt: Date.now(),
  };
}

/** A link that looks like Google My Maps / a shortened maps link - for detection in the tabs */
export function looksLikeMyMaps(url: string): boolean {
  return /google\.[a-z.]+\/maps\/d\/|maps\.app\.goo\.gl|[?&]mid=/i.test(url);
}
