/**
 * Exporting a trip day to Google Maps navigation.
 *
 * ## Why this is a file and not one line
 *
 * The previous version built `https://www.google.com/maps/dir/lat,lng/lat,lng/...`
 * inside the component. That works for a small day and breaks silently in
 * two real cases:
 *
 * 1. **The number of stops.** The documented form (`?api=1`) accepts an
 *    origin, a destination and up to **nine** waypoints. A day with 12
 *    stops simply loses the excess, without anyone knowing - and a traveler
 *    setting out with a missing route is the worst outcome there is.
 *    Therefore the day is split into consecutive legs, and the UI **says**
 *    it was split.
 * 2. **The travel mode.** Without `travelmode` Google guesses driving, and
 *    that is wrong for a walking day in a city center. Derived from the
 *    same field that already drives the inter-city travel legs on the site -
 *    whether the travelers have a car (`preferences.booking.car`).
 *
 * What is not done: we do not send place names. We have verified
 * coordinates in the catalog, and a name ("Café Central") may resolve at
 * Google to a different place in a different city. Navigating to the wrong
 * place is worse than a less pretty URL.
 */

/** A navigation point - only what is needed, so both a pin and a place can be passed */
export interface NavPoint {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Google accepts up to nine waypoints between the origin and the
 * destination, i.e. 11 points per leg. This number comes from the Maps URLs
 * documentation, not from experimentation.
 */
export const MAX_WAYPOINTS = 9;
export const MAX_POINTS_PER_LEG = MAX_WAYPOINTS + 2;

export type TravelMode = 'walking' | 'driving' | 'transit';

const coord = (p: NavPoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * A point that can actually be navigated to - a finite number within
 * Earth's range. The exact same definition as `isUsableCoord` in
 * `lib/outbound.ts`, because "valid enough to navigate to" is the same
 * criterion in both places. Exported so that `DayNavExport` can honestly
 * report dropped points, instead of them vanishing silently inside
 * `googleMapsLegs`'s filter.
 */
export const isValidNavPoint = (p: NavPoint): boolean =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/** One navigation link for a sequence of points. Returns null if there is nowhere to navigate. */
export function googleMapsUrl(points: NavPoint[], mode: TravelMode = 'walking'): string | null {
  const valid = points.filter(isValidNavPoint);
  if (valid.length < 2) return null;
  const capped = valid.slice(0, MAX_POINTS_PER_LEG);
  const origin = capped[0];
  const destination = capped[capped.length - 1];
  const waypoints = capped.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: coord(origin),
    destination: coord(destination),
    travelmode: mode,
  });
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(coord).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface NavLeg {
  url: string;
  /** The number of points in this leg, including the origin and the destination */
  count: number;
  from: string;
  to: string;
}

/**
 * Splits a day into consecutive navigation legs. The split overlaps by one
 * point: the next leg starts where the previous one ended, otherwise there
 * is a hole in the route.
 */
export function googleMapsLegs(points: NavPoint[], mode: TravelMode = 'walking'): NavLeg[] {
  const valid = points.filter(isValidNavPoint);
  if (valid.length < 2) return [];
  const legs: NavLeg[] = [];
  let start = 0;
  while (start < valid.length - 1) {
    const chunk = valid.slice(start, start + MAX_POINTS_PER_LEG);
    const url = googleMapsUrl(chunk, mode);
    if (url) legs.push({ url, count: chunk.length, from: chunk[0].name, to: chunk[chunk.length - 1].name });
    if (chunk.length < MAX_POINTS_PER_LEG) break;
    start += MAX_POINTS_PER_LEG - 1; // one-point overlap
  }
  return legs;
}

/**
 * The travel mode from the preferences. `car: 'have' | 'need'` means the
 * plan involves a car - the same field that decides the inter-city travel
 * legs. Otherwise a city day is walking, which is also what Google will
 * offer to swap in one tap if it does not fit.
 */
export function travelModeFor(car: string | undefined): TravelMode {
  return car === 'have' || car === 'need' ? 'driving' : 'walking';
}
