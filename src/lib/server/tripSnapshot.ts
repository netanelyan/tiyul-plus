/**
 * A read-only snapshot of a trip, for surfaces other than the owner's own screen.
 *
 * This used to live in `server/stories.ts`. The trip-story feature was retired
 * (see the session log for 2026-08-17) because it was the itinerary on a public
 * URL and nothing on it came from the traveller - but the snapshot itself is not
 * story-specific and the group trip depends on it, so it moved here rather than
 * being deleted with the rest.
 *
 * **Names come from the catalog, never from the caller.** A snapshot is built on
 * the server from the stored trip, so a client cannot make a page display content
 * that was not in their own trip.
 */

import { destinations } from '@/data/destinations';
import type { Place, PlaceCategory } from '@/lib/types';

export interface TripStop {
  /** The catalog id - group-trip votes are cast against it; public information anyway */
  id: string;
  name: string;
  lat: number;
  lng: number;
  mustSee?: boolean;
}
export interface TripSnapshotDay {
  dayNumber: number;
  cityName: string;
  stops: TripStop[];
}
export interface TripSnapshot {
  name: string;
  startDate?: string;
  endDate?: string;
  days: TripSnapshotDay[];
}

/** Building the snapshot from the server-stored trip + the catalog. Unrecognised places are skipped. */
export function buildSnapshot(trip: {
  name: string;
  startDate?: string;
  endDate?: string;
  days: { citySlug: string; placeIds: string[] }[];
}): TripSnapshot {
  const days: TripSnapshotDay[] = trip.days.map((d, i) => {
    const dest = destinations.find((x) => x.slug === d.citySlug);
    const stops: TripStop[] = d.placeIds
      .map((pid) => dest?.places.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        ...(p.mustSee ? { mustSee: true } : {}),
      }));
    return { dayNumber: i + 1, cityName: dest?.name ?? d.citySlug, stops };
  });
  return {
    name: String(trip.name).slice(0, 80),
    ...(trip.startDate ? { startDate: trip.startDate } : {}),
    ...(trip.endDate ? { endDate: trip.endDate } : {}),
    days,
  };
}

/* ---------- Catalog content for the public page ---------- */

/**
 * A stop plus the catalog content a read-only page displays.
 *
 * **The name is never re-resolved.** It stays exactly as the snapshot recorded it,
 * so a place renamed in the catalog cannot silently rewrite a page somebody already
 * shared. Only the illustrative fields are enriched, and they are resolved rather
 * than stored so a photo URL we later repair propagates instead of staying dead.
 *
 * A stop whose place is no longer in the catalog keeps its name and coordinates and
 * simply has no photo - the same graceful state as a place that never had one.
 */
export interface EnrichedStop extends TripStop {
  category: PlaceCategory;
  description?: string;
  photo?: string;
}
export interface EnrichedSnapshotDay extends Omit<TripSnapshotDay, 'stops'> {
  stops: EnrichedStop[];
}
export interface EnrichedSnapshot extends Omit<TripSnapshot, 'days'> {
  days: EnrichedSnapshotDay[];
}

/** Every catalog place by id, built once per process - the data is static. */
let placeById: Map<string, Place> | null = null;
function catalogPlace(id: string): Place | undefined {
  if (!placeById) {
    placeById = new Map();
    for (const d of destinations) for (const p of d.places) placeById.set(p.id, p);
  }
  return placeById.get(id);
}

export function enrichSnapshot(snapshot: TripSnapshot): EnrichedSnapshot {
  return {
    ...snapshot,
    days: snapshot.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => {
        const p = s.id ? catalogPlace(s.id) : undefined;
        return {
          ...s,
          // 'attraction' is the neutral default already used for map pins
          category: p?.category ?? 'attraction',
          ...(p?.description ? { description: p.description } : {}),
          ...(p?.photo ? { photo: p.photo } : {}),
        };
      }),
    })),
  };
}
