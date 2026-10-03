import type { MetadataRoute } from 'next';
import { DISALLOWED_PATHS, SITE_URL, canonical } from '@/lib/seo/site';

/**
 * Emitted as a static /robots.txt at build time.
 *
 * The disallow list and the reasoning behind it live in `@/lib/seo/site` - the
 * short version is that `/chat` and `/ask` run the agent, Googlebot executes
 * JavaScript, and the guide pages link into `/chat?q=...`, so without this a
 * crawl would spend real money on Anthropic calls.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...DISALLOWED_PATHS] }],
    /*
      Two sitemaps. The catalog's is generated at build time; the published
      traveller trips change whenever somebody taps publish, so they live in their
      own dynamic one (`/sitemap-trips.xml`).

      **`/embed/` is deliberately NOT disallowed here.** It carries
      `x-robots-tag: noindex`, and a crawler has to be allowed to fetch a URL in
      order to read that header - a path blocked in robots.txt can still end up
      in the index as a bare link, which is the opposite of what is wanted. The
      private paths (`/t/`, `/join/`, `/u/`) keep their existing disallow rules
      unchanged.
    */
    sitemap: [canonical('/sitemap.xml'), canonical('/sitemap-trips.xml')],
    host: SITE_URL,
  };
}
