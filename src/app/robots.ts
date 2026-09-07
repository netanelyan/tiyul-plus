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
    sitemap: canonical('/sitemap.xml'),
    host: SITE_URL,
  };
}
