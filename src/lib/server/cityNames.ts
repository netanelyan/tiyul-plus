import { destinations } from '@/data/destinations';
import type { CityNames } from '@/lib/trip/label';

/**
 * slug → the city's Hebrew name, and nothing more.
 *
 * Built on the server and passed down to `SiteNav` as props. ~166 entries,
 * roughly 4kB before compression, instead of 492kB of compressed catalog in
 * every page's bundle. See the explanation in `label.ts`.
 *
 * Produced on every server render and deliberately not cached: the data is
 * static, `Object.fromEntries` over 166 items is nothing, and a module cache
 * would have been one more piece of state to maintain.
 */
export function cityNames(): CityNames {
  return Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
}
