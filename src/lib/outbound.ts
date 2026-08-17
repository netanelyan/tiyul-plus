import { bookingIsAffiliate, buildBookingUrl } from '@/lib/booking';
import type { BookingKind } from '@/lib/trip/types';

/**
 * **The only place that builds a link leaving the site.**
 *
 * ## Why a module and not another utility
 *
 * Before this, attribution was scattered: `booking.ts` held the four
 * providers, `viator.ts` the one affiliation that actually works, and 1,814
 * places carried a Google Maps URL **hand-written inside the data**, rendered
 * directly by three components. Meaning: on the day a new partner program is
 * approved, one has to search the code for where links are built. Now there
 * is one answer.
 *
 * ## Three claims this module enforces
 *
 * 1. **Coordinates, not names.** 725 of the 1,814 places (40%) carried a URL
 *    of the form `maps.google.com/?q=<English name>`. Search by name is
 *    exactly the trap that has already cost this project twice - "Cartagena"
 *    landed in Spain and "Deira" in Northumbria - and it is worse when the
 *    user reads a Hebrew name and gets a pin in another city. `placeMapUrl`
 *    **ignores** the stored URL when coordinates exist, and builds from them.
 *    This fixes all 725 without touching the data.
 *
 * 2. **Without valid coordinates - no link at all, not a guess.** The previous
 *    version of this module fell back to the stored URL (the name) when
 *    coordinates were missing, arguing that "half a link is better than
 *    nothing". **That is wrong**: half a link that lands somebody on the
 *    wrong street is worse than no link, because it is experienced as
 *    certainty. A traveler who sees an "Open in Google Maps" button trusts
 *    it. `placeMapUrl` returns `null` instead, and the rendering side shows a
 *    short note ("location not verified") instead of the button - so the
 *    absence is visible, not silently hidden. As of today there is no such
 *    place in the catalog (all have real coordinates); this is a safety net
 *    for a future place the data could not locate with confidence.
 *
 * 3. **`rel` is derived from the truth, not from habit.** `sponsored` appears
 *    **only** when the link actually carries an affiliation. `QuickServices`
 *    marked `sponsored` on four links that are not affiliated at all, and
 *    that is a false statement toward Google and toward the reader.
 *
 * ## What is left out, deliberately
 *
 * The OpenStreetMap and CARTO attribution links are a license requirement,
 * not a commercial link. They do not pass through here and will never receive
 * parameters.
 */

/** Six decimal places of precision - about 11 cm, beyond any mapping need. */
const COORD_PRECISION = 6;

const isGoogleMaps = (url: string): boolean => {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'maps.google.com' || h === 'google.com' || h === 'www.google.com' || h.endsWith('.google.com');
  } catch {
    return false;
  }
};

/** Google's documented form for search by point. */
export const mapsPointUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(COORD_PRECISION)},${lng.toFixed(
    COORD_PRECISION,
  )}`;

export interface LinkablePlace {
  lat?: number | null;
  lng?: number | null;
  /** What is written in the data. May be name-based, so it is not a source of truth. */
  externalUrl?: string | null;
}

/** A real coordinate - a finite number within Earth's range, not just "not NaN". */
function isUsableCoord(lat: unknown, lng: unknown): [lat: number, lng: number] | null {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return [lat, lng];
  }
  return null;
}

/**
 * A place's external link, or `null` if there is no reliable link to build.
 *
 * The order is not arbitrary:
 *
 * 1. **A non-Google URL wins** - it is a URL that an external provider
 *    returned (TripAdvisor's `web_url`, a Wikipedia article for an
 *    auto-explored destination), and it is richer than a point on a map.
 *    There is no point replacing a real page with a map.
 * 2. **Otherwise: coordinates**, if present and valid. This is the path for
 *    the whole verified catalog - 1,814 of the 1,814 places, as of the
 *    writing of these lines.
 * 3. **Otherwise: `null`.** Not the old name-based URL, not a guess. A place
 *    without a reliable location gets an absence of a link, not an unreliable
 *    link - see point 2 in the documentation above. The calling side is
 *    responsible for showing that there is no link, not for hiding it.
 */
export function placeMapUrl(place: LinkablePlace): string | null {
  const stored = typeof place.externalUrl === 'string' ? place.externalUrl : null;
  if (stored && !isGoogleMaps(stored)) return stored;

  const coord = isUsableCoord(place.lat, place.lng);
  if (coord) return mapsPointUrl(coord[0], coord[1]);
  return null;
}

/**
 * What the link actually opens - so the label does not lie.
 *
 * The map popup wrote "Open in Google Maps" even on a Wikipedia article of an
 * auto-explored place, because it rendered `externalUrl` blindly.
 */
export type OutboundTarget = 'maps' | 'wikipedia' | 'other';

export function outboundTarget(url: string | null): OutboundTarget {
  if (!url) return 'other';
  if (isGoogleMaps(url)) return 'maps';
  try {
    return new URL(url).hostname.endsWith('wikipedia.org') ? 'wikipedia' : 'other';
  } catch {
    return 'other';
  }
}

/**
 * The attributes every outbound link carries.
 *
 * `sponsored` **only** when the link is genuinely commercially affiliated.
 * Google treats `sponsored` as a declaration, and marking a free page's link
 * with it is a false declaration - exactly like not marking a link that IS
 * affiliated.
 */
export function outboundAttrs(opts: { affiliate?: boolean } = {}): {
  target: '_blank';
  rel: string;
} {
  return {
    target: '_blank',
    rel: opts.affiliate ? 'noopener noreferrer nofollow sponsored' : 'noopener noreferrer nofollow',
  };
}

/**
 * A booking-provider link. Wraps `booking.ts` so components have **one
 * import** for everything that goes outbound, and so the `rel` decision falls
 * out of the same place.
 *
 * On the day a partner program is approved, the only thing that changes is
 * `booking.ts` - one value in `NEXT_PUBLIC_AFFILIATE_*` and one template -
 * and every place rendering a link gets both the affiliated URL and the
 * correct `rel`, with no editing.
 */
export function partnerLink(
  kind: BookingKind,
  query = '',
  extra?: Record<string, string>,
): { url: string | null; attrs: ReturnType<typeof outboundAttrs>; affiliate: boolean } {
  const url = buildBookingUrl(kind, query, extra);
  const affiliate = bookingIsAffiliate(kind);
  return { url, attrs: outboundAttrs({ affiliate }), affiliate };
}
