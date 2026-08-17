import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { buildCityOptions } from '@/lib/citySearch';

/**
 * City data on demand - the route that replaces "download the whole catalog".
 *
 * **Why this exists.** Until now the trip screen (`TripWorkspace`) imported all
 * of `src/data/destinations.ts`: 2MB, 492kB compressed, ~60% of all the JS on
 * the site - to draw a trip that touches one to six cities. Now the browser
 * requests only the cities in the trip, which is ~7kB per city.
 *
 * **The provider is preserved (hard rule 4).** The request goes through
 * `getProvider()`, so an external provider that enriches the data keeps
 * enriching it here too - this is exactly the place where the abstraction is
 * supposed to work.
 *
 * Two modes:
 *   `?slugs=rome,venice` → the full destinations.
 *   `?options=1`         → the list of all cities for the picker (slug/name/country/flag).
 *                          Small, and loaded only when the picker is opened.
 *
 * Read-only over public, static data, so there is no quota here - the same
 * decision recorded for `/t/<code>` - but **there IS a cap on the number of
 * slugs**, so one request cannot ask for the entire catalog and defeat the
 * whole point.
 */
const MAX_SLUGS = 24;

/** Static data per deploy: caches are welcome to keep it happily */
const CACHE = 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get('options') === '1') {
    return NextResponse.json(
      { options: buildCityOptions(destinations, countries) },
      { headers: { 'Cache-Control': CACHE } },
    );
  }

  // A slug is an identifier, not free text: we filter by shape instead of trusting
  // that it will only ever meet an in-memory array lookup. A future external provider
  // might put it in a URL or a query, and that is exactly the point where
  // "it's just a slug" stops being true.
  const SLUG_OK = /^[a-z0-9-]{1,60}$/;
  const slugs = (url.searchParams.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SLUG_OK.test(s))
    .slice(0, MAX_SLUGS);
  if (slugs.length === 0) return NextResponse.json({ cities: [] }, { headers: { 'Cache-Control': CACHE } });

  const provider = getProvider();
  const found = await Promise.all(slugs.map((s) => provider.getDestination(s)));
  return NextResponse.json(
    { cities: found.filter((d) => d !== null) },
    { headers: { 'Cache-Control': CACHE } },
  );
}
