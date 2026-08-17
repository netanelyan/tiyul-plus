import type { Trip, TripDay } from './types';
import { newId } from './types';
import { safeDates } from './dates';

/**
 * A trip share link - Phase 4 (viral loop), with no backend:
 * the trip is encoded into the URL itself (/t/<code>) and opens read-only
 * for anyone. Only ids are encoded (citySlug + placeIds) - the curated
 * data is already in the app, so the link stays short and decoding is
 * always rendered against real places only.
 *
 * When accounts (backend) arrive, the same /t/<code> screen will also
 * accept short codes from the server - the format here is v1 and carries
 * a version marker to make that transition possible.
 *
 * **Decoding (`decodeTripShare`) lives in `@/lib/server/shareDecode`**,
 * not here, because it validates every id against the catalog - and
 * anyone importing this file on the client side (the trip screen, which
 * generates a link) would have dragged the entire catalog along with it.
 * Both consumers of decoding are servers anyway: `/api/share` and
 * `/t/[code]`.
 */

export type ShareDay = [citySlug: string, placeIds: string[], notes?: string];
/**
 * v1: `[1, name, days]`. v2 adds dates at the end - `[2, name, days, start?, end?]`.
 * **v1 links keep opening forever**: a code shared on WhatsApp a year ago
 * must still work, so decoding accepts both versions and only encoding
 * moved up a version. A trip with no dates is still encoded as v1, so the
 * link does not grow for no reason.
 */
type SharePayloadV1 = [version: 1, name: string, days: ShareDay[]];
type SharePayloadV2 = [version: 2, name: string, days: ShareDay[], startDate?: string, endDate?: string];
export type SharePayload = SharePayloadV1 | SharePayloadV2;

/* ---------- Isomorphic base64url (browser + Node) for UTF-8 ---------- */

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/* ---------- Encoding ---------- */

export function encodeTripShare(trip: Trip): string {
  const days = trip.days.map((d): ShareDay => {
    const day: ShareDay = [d.citySlug, d.placeIds];
    if (d.notes) day[2] = d.notes;
    return day;
  });
  const { startDate, endDate } = safeDates(trip);
  const payload: SharePayload = startDate
    ? ([2, trip.name, days, startDate, endDate] as SharePayloadV2)
    : ([1, trip.name, days] as SharePayloadV1);
  return toBase64Url(JSON.stringify(payload));
}

/* ---------- Decoding + validation against the curated data ---------- */

export interface SharedTrip {
  name: string;
  days: { citySlug: string; placeIds: string[]; notes?: string }[];
  /** v2 only; a v1 link simply carries no dates */
  startDate?: string;
  endDate?: string;
}


/** Builds a fresh Trip (new ids) from the shared content - for importing into "my trips" */
export function tripFromShared(shared: SharedTrip): Trip {
  const citySlugs: string[] = [];
  for (const d of shared.days) if (!citySlugs.includes(d.citySlug)) citySlugs.push(d.citySlug);
  return {
    id: newId(),
    name: shared.name,
    citySlugs,
    createdAt: Date.now(),
    days: shared.days.map(
      (d): TripDay => ({ id: newId(), citySlug: d.citySlug, placeIds: [...d.placeIds], notes: d.notes }),
    ),
    ...safeDates(shared),
  };
}
