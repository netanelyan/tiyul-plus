import { canonical } from '@/lib/seo/site';
import { listSitemapTrips } from '@/lib/server/publicTrips';

/**
 * `/sitemap-trips.xml` - the published traveller trips, and nothing else.
 *
 * ## Why it is separate from `/sitemap.xml`
 *
 * The main sitemap is generated at **build time** from the catalog: it is the
 * same for every visitor until the next deploy, which is exactly right for pages
 * that only change when we ship. Published trips change when a stranger taps a
 * button, so folding them in would mean either a stale list until the next deploy
 * or turning the whole sitemap dynamic to serve a handful of rows.
 *
 * Keeping them apart also means a problem with the database cannot take the
 * catalog's sitemap down with it: this route answers with an empty (valid)
 * sitemap when `public_trips` is unavailable, and `/sitemap.xml` never knew.
 *
 * ## Only indexable, live trips
 *
 * The SQL function filters on `unpublished_at is null and indexable`, so a
 * withdrawn page leaves this list in the same write that withdrew it, and a trip
 * under the stop threshold never enters it. That is the same stored flag the
 * page's `robots` tag reads - a URL cannot be submitted here while telling
 * crawlers to ignore it, which is the contradiction the main sitemap's own test
 * exists to prevent.
 */

/**
 * Dynamic, with the freshness pushed into `Cache-Control` instead.
 *
 * `export const revalidate = 3600` looks equivalent and is not: it makes Next
 * **prerender this route at build time**, so the sitemap is generated with
 * whatever the database held during the build - which, in CI, is nothing. Every
 * deploy would publish an empty sitemap and keep serving it for an hour.
 * Measured, not guessed: the first build of this route emitted an empty urlset.
 *
 * Forcing it dynamic and letting the CDN hold it for an hour gives the same
 * request volume with none of that.
 */
export const dynamic = 'force-dynamic';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const trips = await listSitemapTrips();

  const urls = trips
    .map((t) => {
      const loc = esc(canonical(`/trips/${t.slug}`));
      // lastmod is the real row timestamp, as a date. A trip that was edited and
      // re-published moves; one that was not, does not.
      const day = typeof t.updatedAt === 'string' ? t.updatedAt.slice(0, 10) : '';
      const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(day) ? `<lastmod>${day}</lastmod>` : '';
      /*
        Deliberately lower priority than any catalog page. These are useful and
        real, but a curated destination guide is the stronger page, and priority
        is the one place we say so.
      */
      return `<url><loc>${loc}</loc>${lastmod}<priority>0.4</priority></url>`;
    })
    .join('');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
