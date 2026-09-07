import type { MetadataRoute } from 'next';
import { getProvider } from '@/lib/providers';
import { canonical } from '@/lib/seo/site';
import { SEO_DESTINATION_SLUGS, isSeoDestination, seoCountrySlugs } from '@/lib/seo/selection';

/**
 * Emitted as a static /sitemap.xml at build time.
 *
 * ## It cannot drift from the pages, by construction
 *
 * This reads the catalog through `getProvider()` - the same interface the
 * destination and country pages read - so a URL can only appear here if the
 * catalog that builds the pages contains it. There is no second list of cities
 * to forget to update. The one hand-maintained input is
 * `SEO_DESTINATION_SLUGS`, and it is shared with the pages too: the same module
 * decides which destinations render the guide section.
 *
 * ## What is deliberately not in here
 *
 * - **The other 136 destinations.** They exist, they are crawlable, and they now
 *   have unique metadata. Not submitting them keeps the promoted set uniformly
 *   substantive on a domain with no authority yet. See `selection.ts`.
 * - **The 61 country pages with no promoted city.** Same reasoning.
 * - **`/premium`** - it already sets `robots: { index: false }` deliberately.
 * - **`/chat`, `/ask` and the per-user routes** - disallowed in robots.txt,
 *   because crawling the agent costs money per request.
 * - **The policy pages** (privacy, terms, refunds, cookies, accessibility).
 *   They are linked in the footer and perfectly crawlable; they are just not
 *   pages we are asking Google to spend crawl budget on.
 *
 * ## No lastModified
 *
 * The honest value would be the day each destination's data last changed, and
 * the catalog does not record that per row. The available substitute is the
 * build date, which would stamp every URL as modified on every unrelated deploy
 * - a signal that is not merely useless but actively misleading. Omitted rather
 * than faked. `priority` is kept only as a coarse hierarchy hint.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const provider = getProvider();
  const [allDestinations, allCountries] = await Promise.all([
    provider.getDestinations(),
    provider.getCountries(),
  ]);

  const core: MetadataRoute.Sitemap = [
    { url: canonical('/'), priority: 1 },
    { url: canonical('/countries'), priority: 0.8 },
    { url: canonical('/kosher'), priority: 0.8 },
    { url: canonical('/about'), priority: 0.4 },
    { url: canonical('/contact'), priority: 0.3 },
  ];

  const destinationEntries: MetadataRoute.Sitemap = allDestinations
    .filter((d) => isSeoDestination(d.slug))
    .map((d) => ({ url: canonical(`/destinations/${d.slug}`), priority: 0.9 }));

  const promotedCountries = new Set(seoCountrySlugs(allDestinations));
  const countryEntries: MetadataRoute.Sitemap = allCountries
    .filter((c) => promotedCountries.has(c.slug))
    .map((c) => ({ url: canonical(`/countries/${c.slug}`), priority: 0.7 }));

  // A promoted slug that no longer resolves to a destination would silently
  // shrink the sitemap. Fail the build instead - it means the catalog dropped a
  // city we are actively asking Google to index.
  if (destinationEntries.length !== SEO_DESTINATION_SLUGS.length) {
    const found = new Set(allDestinations.map((d) => d.slug));
    const missing = SEO_DESTINATION_SLUGS.filter((s) => !found.has(s));
    throw new Error(
      `sitemap: promoted destination slug(s) not found in the catalog: ${missing.join(', ')}`,
    );
  }

  return [...core, ...destinationEntries, ...countryEntries];
}
