/**
 * Server only - reading a single, ownership-verified trip from
 * `user_trips`, for payments (eligibility check and report building). Not
 * to be confused with `server/tripStats.ts`, which produces a **view** for
 * the admin - here a real `Trip` object is returned, because the report
 * builder (`predepartureReport.ts`) needs the full fields.
 */

import { adminSelect } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import type { Trip } from '@/lib/trip/types';

interface TripRow {
  data: unknown;
}

/** A loose check only - a row that does not look like a trip is simply not accepted, without throwing */
function looksLikeTrip(data: unknown): data is Trip {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const t = data as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    Array.isArray(t.citySlugs) &&
    Array.isArray(t.days)
  );
}

/** The trip, only if `userId` owns it per `user_trips`. `null` otherwise. */
export async function findOwnTrip(userId: string, tripId: string): Promise<Trip | null> {
  const rows = await adminSelect<TripRow>(
    'user_trips',
    pgQuery(eq('user_id', userId), eq('id', tripId), pgSelect(['data']), pgLimit(1)),
  );
  const data = rows?.[0]?.data;
  if (!looksLikeTrip(data)) return null;
  // Corrupt days do not crash the caller - cleaned here instead of in every consumer separately
  const days = Array.isArray(data.days)
    ? data.days.filter((d) => d && typeof d === 'object' && Array.isArray((d as { placeIds?: unknown }).placeIds))
    : [];
  return { ...data, days };
}
