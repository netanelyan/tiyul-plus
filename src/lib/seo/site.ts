/**
 * Site-level SEO constants and the small helpers every page's metadata uses.
 *
 * The canonical host lives here rather than in `layout.tsx` so that the layout,
 * the sitemap, the robots file and every `generateMetadata` all read one value.
 * A canonical URL that disagrees with the sitemap is the kind of defect that
 * costs weeks of indexing before anyone notices it.
 */

/** No trailing slash. Everything below composes onto it. */
export const SITE_URL = 'https://www.tiyulplus.com';

export const SITE_NAME = 'טיול+';

/** Absolute URL for a path. Pass a leading-slash path; '/' gives the origin. */
export function canonical(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * A meta description built from real catalog prose.
 *
 * Google truncates around 155-160 characters, so anything past that is wasted
 * rather than harmful - but a description cut mid-word reads as broken, and in
 * Hebrew it can cut mid-name. So this trims on a word boundary and only adds an
 * ellipsis when it actually removed something.
 *
 * Newlines are collapsed because the catalog's prose is hand-wrapped in places
 * and a raw newline inside a meta tag is silently dropped by some crawlers.
 *
 * Parts are joined with a middot rather than a space. The catalog's `tagline`
 * is a fragment with no closing punctuation, so a plain space ran it straight
 * into the `summary` - the first build produced Vienna's tagline ending in
 * "...a lively Jewish community" immediately followed by "Vienna is...", which
 * reads as one broken sentence in a search result. The
 * separator is skipped where the preceding part already ends in punctuation, so
 * a tagline that does end in a full stop does not get a stray middot after it.
 */
export function metaDescription(...parts: (string | undefined | null)[]): string {
  const clean = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => p.replace(/\s+/g, ' ').trim());

  const text = clean
    .reduce((acc, part, i) => {
      if (i === 0) return part;
      const sep = /[.!?,;:·-]$/.test(acc) ? ' ' : ' · ';
      return acc + sep + part;
    }, '')
    .trim();

  const LIMIT = 155;
  if (text.length <= LIMIT) return text;

  const cut = text.slice(0, LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  // Only honour the word boundary if it is not so early that it throws away
  // most of the description (a single very long token).
  const body = lastSpace > LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[,.;:\-–—]$/, '')}...`;
}

/**
 * Routes that must never be crawled, shared by `robots.ts` and used as the
 * reasoning record for why.
 *
 * Two different reasons, and the first one is about money:
 *
 * 1. **`/chat` and `/ask` run the agent.** `AgentWorkspace` auto-sends a `?q=`
 *    parameter on mount, and Googlebot executes JavaScript - so a crawled
 *    `/chat?q=...` link is a real Anthropic API call that we pay for, once per
 *    crawl. The destination pages deliberately link into `/chat?q=` as their
 *    call to action, so this disallow is what keeps that CTA from becoming a
 *    crawl-rate-sized bill. The links themselves also carry `rel="nofollow"`;
 *    robots.txt is the backstop, not the only measure.
 * 2. **The rest are private or per-user surfaces** with nothing to index: the
 *    API, the admin dashboard, a user's account, a group-trip invite, a shared
 *    trip link and a traveller profile.
 */
export const DISALLOWED_PATHS = [
  '/api/',
  '/chat',
  '/ask',
  '/admin',
  '/account',
  '/join/',
  '/t/',
  '/u/',
] as const;
