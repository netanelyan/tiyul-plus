import type { Metadata } from 'next';

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
 * Everything a static page needs to describe itself: canonical, og:url and the
 * share card.
 *
 * ## Why it exists, and it is not tidiness
 *
 * Next merges metadata **per top-level field**, and the root layout sets
 * `alternates: { canonical: SITE_URL }`. Its comment says "child routes
 * override this with their own" - and sixteen of them never did, so every one
 * of them shipped a canonical pointing at the homepage. That tells Google the
 * catalog hub, the kosher directory, the about page and the contact page are
 * all duplicates of `/`, which is the strongest possible instruction to drop
 * them. `og:url` was wrong the same way, which is a WhatsApp preview naming
 * the wrong page.
 *
 * The fix is a helper rather than sixteen copy-pastes precisely because the
 * failure mode was sixteen pages each forgetting the same two lines.
 *
 * ## The share image has to be repeated here, and that is the subtle part
 *
 * Per-field merging cuts both ways: the moment a page declares `openGraph`,
 * the parent's `openGraph` is **replaced, not merged**, so its `images` go
 * with it. That is not hypothetical - it is measured on production today,
 * where `/collections` sets its own openGraph block and serves **no og:image
 * at all**, while `/about`, which sets none, correctly inherits `/og.png`.
 *
 * So a naive helper would have given all sixteen pages a correct canonical and
 * silently taken away their share image: one WhatsApp bug traded for another.
 * `images` is therefore declared here explicitly. A page with a real photograph
 * of its own (a destination, a country) passes it in and overrides this.
 */
export function pageMetadata({
  path,
  title,
  description,
  images,
  noindex = false,
}: {
  path: string;
  title: string;
  description?: string;
  /** Override the default share card, e.g. a destination's own photo. */
  images?: NonNullable<Metadata['openGraph']>['images'];
  /**
   * `index: false, follow: true` - keep it out of the results, still walk its
   * links. Used for the app surfaces that have no content to rank.
   */
  noindex?: boolean;
}): Metadata {
  const url = canonical(path);
  const og = images ?? [
    { url: '/og.png', width: 1200, height: 630, alt: 'טיול+ - סוכן הנסיעות החכם לישראלים' },
  ];
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      siteName: SITE_NAME,
      url,
      title,
      ...(description ? { description } : {}),
      images: og,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: og,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
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
 * The official profiles for this brand, in one place because two consumers
 * need them and a second copy is how they drift: the footer renders them as
 * links, and the homepage declares them as `sameAs` on the Organization, which
 * is how a search engine works out that the account and the site are the same
 * entity. A profile listed in one and not the other is a contradiction we are
 * publishing about ourselves.
 *
 * Only the Instagram account was verifiable from the authoring environment;
 * Facebook and TikTok answer every request with a login wall, so their
 * existence is taken from the footer, which has published them for months.
 */
export const SOCIAL_PROFILES = [
  { href: 'https://instagram.com/tiyulplus', label: 'אינסטגרם' },
  { href: 'https://facebook.com/tiyulplus', label: 'פייסבוק' },
  { href: 'https://tiktok.com/@tiyulplus', label: 'טיקטוק' },
] as const;

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
