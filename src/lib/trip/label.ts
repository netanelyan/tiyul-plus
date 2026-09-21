import type { Trip } from './types';

/**
 * A short title for a trip based on the cities in it - a single name for one destination, or two
 * joined with a plus for several.
 *
 * **The function receives a name map rather than importing the catalog, and this is why:** it is
 * called from `SiteNav`, which sits in the layout and therefore exists on every page of the site.
 * The `import { destinations }` that used to be here dragged the entire catalog (2MB, 492kB
 * compressed) into the shared bundle - **on every page, including the homepage and the destination
 * pages that never touch it** - just to translate a slug into a city name. Measured: that was
 * about 60% of all the JS on the site.
 *
 * The map is built on the server (`cityNames()` in `@/lib/server/cityNames`) and comes down as
 * props: a few kilobytes, and always in sync with the catalog because it is derived from it. A
 * generated, committed file would have saved a little more and gone stale silently every time the
 * data session adds a city - and that is a bad trade.
 */
export type CityNames = Record<string, string>;

export function tripLabel(trip: Trip, names: CityNames): string {
  const found = trip.citySlugs.map((slug) => names[slug]).filter((n): n is string => Boolean(n));
  if (found.length === 0) return trip.name || 'טיול';
  if (found.length === 1) return found[0];
  return `${found[0]} + ${found[found.length - 1]}`;
}

/**
 * Who is travelling, in Hebrew - one definition, because there were four.
 *
 * `solo` was "לבד" on the questionnaire and "סולו" on the planner, on the
 * preference chip and in the preference summary, so a traveller picked one
 * word and the trip screen then showed them another for the same choice.
 *
 * Standardised on the plain Hebrew rather than the loanword: the options sit
 * beside זוג, משפחה and חברים, and "סולו" is the only one of the four in a
 * different register.
 */
export const PARTY_LABELS: Record<'couple' | 'family' | 'friends' | 'solo', string> = {
  couple: 'זוג',
  family: 'משפחה',
  friends: 'חברים',
  solo: 'לבד',
};
