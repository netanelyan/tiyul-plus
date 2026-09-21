import type { MetadataRoute } from 'next';
import { getProvider } from '@/lib/providers';
import { canonical } from '@/lib/seo/site';
import { isSeoDestination, seoCountrySlugs } from '@/lib/seo/selection';
import { HUBS } from '@/lib/seo/hubs';
import { lastModified } from '@/lib/seo/contentDates';

/**
 * Emitted as a static /sitemap.xml at build time.
 *
 * ## It cannot drift from the pages, by construction
 *
 * This reads the catalog through `getProvider()` - the same interface the
 * destination and country pages read - so a URL can only appear here if the
 * catalog that builds the pages contains it, and every catalogue page appears
 * without anyone remembering to add it. There is no second list of cities.
 *
 * ## Every page is submitted now, not a promoted subset
 *
 * The first version listed 72 URLs: 30 hand-picked destinations, the 22 countries
 * they sit in, the hubs and six core pages. The reasoning was real - a young
 * domain that submits 166 pages of uneven depth risks being classified as thin
 * site-wide - but it had two costs that have outgrown it.
 *
 * The 136 unlisted destinations were never hidden: they render, they are linked
 * from `/countries` and from every country page, and since the metadata pass they
 * each carry a unique title, description and canonical. Leaving them out of the
 * sitemap therefore did not protect anything; it only slowed down the discovery
 * of pages Google was going to crawl through internal links anyway. And the
 * catalog is no longer uneven in the way that argument assumed: it now holds
 * 3,300+ places across all 166 destinations, and the thinnest are limited by
 * sources rather than by effort.
 *
 * What survives of the original caution is `priority`, which still says plainly
 * which pages we consider our strongest: the promoted 30 sit above the rest, as
 * do the countries that contain one.
 *
 * ## `noindex` pages are excluded, and that is enforced rather than remembered
 *
 * `/chat`, `/ask`, `/account`, `/planner` and `/start` set `robots: index:false`
 * because they are app surfaces with nothing to rank, and asking a crawler to
 * fetch a page that then tells it to go away wastes crawl budget and contradicts
 * us. `sitemap.test.ts` scans every route for `noindex: true` and fails if one of
 * them reaches this list, so the rule holds without a second list to maintain.
 *
 * `/premium` used to be in that set and no longer is - it is the pricing page and
 * it is now indexable, so it is submitted here.
 *
 * ## lastmod
 *
 * Real per-page dates, from `src/lib/seo/content-dates.json`: a hash of exactly
 * the data that renders each URL, with the date moved only when that hash
 * changes. The build date would have been the easy answer and it would have
 * marked all 270 pages as modified on every unrelated deploy. See
 * `scripts/content-dates.mjs`. A URL with no ledger entry yet gets no lastmod
 * rather than a guessed one.
 */

/**
 * Priority is a hint about relative importance within this site, nothing more.
 * Kept from the first version so the hierarchy is unchanged where it overlaps.
 */
const PRIORITY = {
  home: 1,
  hub: 0.7,
  /** The core browse surfaces and the pricing page. */
  core: 0.8,
  /** A destination carrying the long-form guide section. */
  promotedDestination: 0.9,
  destination: 0.6,
  /** A country that contains at least one promoted destination. */
  promotedCountry: 0.7,
  country: 0.5,
  /** Pages that exist to be read once, not to rank. */
  informational: 0.4,
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const provider = getProvider();
  const [allDestinations, allCountries] = await Promise.all([
    provider.getDestinations(),
    provider.getCountries(),
  ]);

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => {
    const lastModifiedAt = lastModified(path);
    return {
      url: canonical(path),
      priority,
      ...(lastModifiedAt ? { lastModified: lastModifiedAt } : {}),
    };
  };

  const core: MetadataRoute.Sitemap = [
    entry('/', PRIORITY.home),
    entry('/countries', PRIORITY.core),
    entry('/kosher', PRIORITY.core),
    entry('/collections', PRIORITY.core),
    entry('/premium', PRIORITY.core),
    entry('/about', PRIORITY.informational),
    entry('/contact', 0.3),
  ];

  const hubEntries = HUBS.map((h) => entry(`/collections/${h.slug}`, PRIORITY.hub));

  const destinationEntries = allDestinations.map((d) =>
    entry(
      `/destinations/${d.slug}`,
      isSeoDestination(d.slug) ? PRIORITY.promotedDestination : PRIORITY.destination,
    ),
  );

  const promotedCountries = new Set(seoCountrySlugs(allDestinations));
  const countryEntries = allCountries.map((c) =>
    entry(
      `/countries/${c.slug}`,
      promotedCountries.has(c.slug) ? PRIORITY.promotedCountry : PRIORITY.country,
    ),
  );

  return [...core, ...hubEntries, ...destinationEntries, ...countryEntries];
}
