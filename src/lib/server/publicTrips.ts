/**
 * Server only - storage for owner-published trips (`/trips/<slug>`).
 *
 * Reads and writes go through the service role, i.e. only from our server, i.e.
 * always behind the publish route's ownership check and quotas. `public_trips`
 * has RLS on with no policy, so there is no browser path to this table at all -
 * not even a read, because the public page is server-rendered.
 *
 * Needs `sql/supabase-public-trips.sql`. Without it every call here returns null
 * or an empty list, publishing reports `not-configured`, and nothing else on the
 * site changes - the feature is simply absent rather than half-present.
 */
import { destinations } from '@/data/destinations';
import { adminInsert, adminRpc, adminUpdate, adminDbEnabled } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery } from '@/lib/server/pgrest';
import {
  buildSlug,
  indexable,
  isPublicTripSlug,
  newShortId,
  parseSnapshot,
  primaryCity,
  stopCount,
  toPublicSnapshot,
  type CatalogLookup,
  type PublicTripSnapshot,
} from '@/lib/trip/publicTrip';
import type { Trip } from '@/lib/trip/types';

/* ---------------------------------------------------------------- *
 * The catalog, as the narrow interface publicTrip.ts asks for
 * ---------------------------------------------------------------- */

let lookupCache: CatalogLookup | null = null;

/**
 * Built once per process and memoised. `destinations` is ~4MB and the id sets
 * are derived from it on every publish and every public page render; rebuilding
 * them per request would be the most expensive thing on the route.
 *
 * Deliberately a `Map` of `Set`s rather than `find`/`includes`: a trip can hold
 * 40 stops and the catalog holds thousands of places, so the naive version is a
 * linear scan per stop.
 */
export function catalogLookup(): CatalogLookup {
  if (lookupCache) return lookupCache;
  const byCity = new Map<string, Set<string>>();
  for (const d of destinations) byCity.set(d.slug, new Set(d.places.map((p) => p.id)));
  lookupCache = { placeIdsOf: (slug) => byCity.get(slug) };
  return lookupCache;
}

/* ---------------------------------------------------------------- *
 * Rows
 * ---------------------------------------------------------------- */

interface PublicTripRow {
  slug: string;
  snapshot: unknown;
  city_slug: string;
  day_count: number;
  stop_count: number;
  indexable: boolean;
  published_at: string;
  updated_at: string;
  unpublished_at: string | null;
}

export interface PublicTripRecord {
  slug: string;
  snapshot: PublicTripSnapshot;
  citySlug: string;
  dayCount: number;
  stopCount: number;
  indexable: boolean;
  publishedAt: string;
  updatedAt: string;
}

/** 'gone' is a real answer, not an error: the slug existed and was withdrawn. */
export type PublicTripResult =
  | { state: 'live'; record: PublicTripRecord }
  | { state: 'gone' }
  | { state: 'missing' };

export const publicTripsEnabled = () => adminDbEnabled();

/**
 * One published trip by slug.
 *
 * The slug shape is checked here before the network, and again by the regex that
 * built it - the value arrives from a URL segment, and a route parameter is the
 * most attacker-controlled string this module handles.
 */
export async function getPublicTrip(slug: string): Promise<PublicTripResult> {
  if (!isPublicTripSlug(slug) || !publicTripsEnabled()) return { state: 'missing' };
  const rows = await adminRpc<PublicTripRow[]>('get_public_trip', { p_slug: slug });
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return { state: 'missing' };
  if (row.unpublished_at) return { state: 'gone' };

  const snapshot = parseSnapshot(row.snapshot, catalogLookup());
  /*
    A row whose snapshot no longer parses is treated as GONE rather than as a
    server error. The alternative is a 500 on a URL that is in Google's index,
    which is the one outcome worse than the page being retired.
  */
  if (!snapshot) return { state: 'gone' };

  return {
    state: 'live',
    record: {
      slug: row.slug,
      snapshot,
      citySlug: row.city_slug,
      dayCount: row.day_count,
      stopCount: row.stop_count,
      indexable: row.indexable,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    },
  };
}

export interface CityTripSummary {
  slug: string;
  dayCount: number;
  stopCount: number;
  snapshot: PublicTripSnapshot;
}

/** The newest indexable trips for one city - the "travellers' trips" block. */
export async function listPublicTripsForCity(citySlug: string, limit = 6): Promise<CityTripSummary[]> {
  if (!publicTripsEnabled()) return [];
  const rows = await adminRpc<
    { slug: string; day_count: number; stop_count: number; snapshot: unknown }[]
  >('list_public_trips_for_city', { p_city: citySlug, p_limit: limit });
  if (!Array.isArray(rows)) return [];
  const catalog = catalogLookup();
  return rows
    .map((r) => {
      const snapshot = parseSnapshot(r.snapshot, catalog);
      return snapshot
        ? { slug: r.slug, dayCount: r.day_count, stopCount: r.stop_count, snapshot }
        : null;
    })
    .filter((x): x is CityTripSummary => x !== null);
}

/** Every indexable published trip, for the trips sitemap. */
export async function listSitemapTrips(): Promise<{ slug: string; updatedAt: string }[]> {
  if (!publicTripsEnabled()) return [];
  const rows = await adminRpc<{ slug: string; updated_at: string }[]>('list_public_trips_sitemap', {});
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}

/** The live publication for one of the caller's trips, if any - so the toggle knows its state. */
export async function findPublicationFor(userId: string, tripId: string): Promise<{ slug: string; indexable: boolean } | null> {
  if (!publicTripsEnabled()) return null;
  const rows = await adminRpc<{ slug: string; indexable: boolean; unpublished_at: string | null }[]>(
    'get_public_trip_for_trip',
    { p_user: userId, p_trip: tripId },
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row && !row.unpublished_at ? { slug: row.slug, indexable: row.indexable } : null;
}

export type PublishOutcome =
  | { ok: true; slug: string; indexable: boolean; stopCount: number }
  | { ok: false; error: 'no-city' | 'not-configured' | 'db-failed' };

/**
 * Publish a trip the caller owns.
 *
 * The caller has already proved ownership (`findOwnTrip`) and passed the quotas.
 * What happens here is the strip, the slug, and the write.
 *
 * **Re-publishing an already-published trip updates the existing row and keeps
 * its slug.** That matters more than it looks: the slug may be in somebody's
 * bookmarks, in Google's index and on a blog that embedded it, and minting a new
 * one on every edit would leave a trail of 410s behind a trip that was never
 * withdrawn.
 */
export async function publishTrip(userId: string, trip: Trip): Promise<PublishOutcome> {
  if (!publicTripsEnabled()) return { ok: false, error: 'not-configured' };
  const catalog = catalogLookup();
  const snapshot = toPublicSnapshot(trip, catalog);
  const city = primaryCity(snapshot);
  /*
    No catalog city at all means there is nothing a public page could be about -
    every day pointed at something we hold no data for. Refused rather than
    published as an empty shell.
  */
  if (!city || !catalog.placeIdsOf(city)) return { ok: false, error: 'no-city' };

  const stops = stopCount(snapshot);
  const canIndex = indexable(snapshot, catalog);

  const existing = await findPublicationFor(userId, trip.id);
  const common = {
    snapshot,
    city_slug: city,
    day_count: snapshot.days.length,
    stop_count: stops,
    indexable: canIndex,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const updated = await adminUpdate<PublicTripRow>(
      'public_trips',
      pgQuery(eq('slug', existing.slug)),
      common,
    );
    if (!updated) return { ok: false, error: 'db-failed' };
    return { ok: true, slug: existing.slug, indexable: canIndex, stopCount: stops };
  }

  /*
    Three attempts at a fresh slug. A collision needs the same city, the same day
    count AND the same 8-character id, so one retry would do; three costs nothing
    and removes the question.
  */
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = buildSlug(city, snapshot.days.length, newShortId());
    const inserted = await adminInsert<PublicTripRow>('public_trips', {
      slug,
      user_id: userId,
      trip_id: trip.id,
      published_at: new Date().toISOString(),
      ...common,
    });
    if (inserted) return { ok: true, slug, indexable: canIndex, stopCount: stops };
  }
  return { ok: false, error: 'db-failed' };
}

/**
 * Withdraw a publication.
 *
 * Sets the tombstone **and clears the snapshot in the same write**: the page must
 * stop serving content the moment the owner asks, and leaving the stripped
 * snapshot behind would mean an unpublished trip still exists as data. The row
 * survives only to answer 410 for a slug that search engines already know.
 */
export async function unpublishTrip(userId: string, tripId: string): Promise<boolean> {
  if (!publicTripsEnabled()) return false;
  const existing = await findPublicationFor(userId, tripId);
  if (!existing) return true; // already not published - the caller's goal is met
  const updated = await adminUpdate<PublicTripRow>(
    'public_trips',
    // Filtered on the owner too, not just the slug: a bug in the lookup above
    // must not become a way to withdraw somebody else's page.
    pgQuery(eq('slug', existing.slug), eq('user_id', userId)),
    {
      unpublished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      indexable: false,
      snapshot: { v: 1, days: [], month: null },
    },
  );
  return Array.isArray(updated);
}
