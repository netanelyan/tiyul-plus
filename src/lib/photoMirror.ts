/**
 * Where a catalog photograph is actually served from.
 *
 * ## The problem
 *
 * Every photograph in the catalog is hotlinked from `upload.wikimedia.org` at
 * 250-500px. Two costs, and the second is the expensive one:
 *
 * 1. **Blurry on a dense screen.** A card is ~360 CSS px wide and phones are
 *    DPR 3, so it wants ~1080 real pixels and gets 500.
 * 2. **A Commons rename is a dead image, silently.** The URL contains the
 *    filename and an md5 of that filename, so renaming the file on Commons
 *    breaks the link with no redirect. This log already records 151 dead URLs
 *    from one earlier pass, repaired by hand over several sessions.
 *
 * ## The fix, and why it is a derivation rather than a lookup
 *
 * `scripts/mirror-photos.mjs` copies each file to our own Blob store at 1280px
 * under a path derived from the Commons filename. Because the path is
 * *derived*, nothing has to be looked up at render time: no manifest ships to
 * the browser, no data file grows, and a client component can resolve a URL as
 * cheaply as a server one. The script asserts that the URL the store returns is
 * byte-identical to the one this module derives, so the two cannot drift.
 *
 * ## `photo` in the catalog stays the Commons URL, deliberately
 *
 * The swap happens here, at the `<img src>`, and nowhere else. That keeps one
 * thing true that everything else depends on: the catalog URL still contains the
 * Commons filename, which is how `lib/server/photoCredit.ts` finds the Artist
 * and LicenseShortName for the credits block, how `verify-photos.mjs` probes the
 * source, and how the validator checks widths. Rewriting the stored URL would
 * have meant re-deriving all of that from a hash.
 *
 * ## Off by default
 *
 * With `NEXT_PUBLIC_PHOTO_MIRROR_BASE` unset, every function here returns the
 * original URL and the site renders exactly as it did before. That is not
 * timidity: the Blob store has to be created and the script has to finish before
 * a single mirrored URL exists, and a version of this that switched itself on at
 * deploy would have served 3,000 404s in the window between.
 */

/**
 * The origin of the Blob store, e.g. `https://abc123.public.blob.vercel-storage.com`.
 * No trailing slash.
 *
 * Read as a static property, never `process.env[name]` - Next inlines
 * `NEXT_PUBLIC_*` at build time by literal substitution, and a dynamic lookup
 * silently evaluates to `undefined` in the browser. The affiliate IDs were
 * written the dynamic way once and were `undefined` client-side for it.
 */
const BASE = (process.env.NEXT_PUBLIC_PHOTO_MIRROR_BASE ?? '').replace(/\/+$/, '');

/**
 * The widths `upload.wikimedia.org` will actually serve.
 *
 * Not a convention of ours - Wikimedia rejects any other width outright with
 * **HTTP 400** and an error page reading "Use thumbnail sizes listed on
 * https://w.wiki/GHai". Measured across four files: 250/330/500/960/1280 serve,
 * 640/800/1024/1200/1500 all 400. The full production list is 20, 40, 60, 120,
 * 250, 330, 500, 960, 1280, 1920, 3840; these are the ones large enough to be
 * useful here.
 *
 * This is why widening has to snap to a bucket rather than take a source width
 * literally. It is also the other half of the story behind the 170 dead URLs
 * this file keeps citing: a width can be unavailable because the original is too
 * small OR because the number is not on the list, and only the first of those
 * was ever written down.
 */
export const STANDARD_THUMB_WIDTHS = [250, 330, 500, 960, 1280] as const;

/**
 * The width every mirrored file is stored at.
 *
 * 1280 and not 1200: 1200 is not a standard Wikimedia width, so every fetch the
 * archive script made would have been a 400. It is also comfortably past the
 * 1200px that Facebook asks of a share image, which is the other consumer.
 */
export const MIRROR_WIDTH = 1280;

/**
 * Shown when an image that should exist fails to load.
 *
 * A local file, so it works when the network does not and cannot itself 404.
 * Only the surfaces with nowhere better to fall back to use it: a place card
 * falls back to its category tile and a destination card to the brand gradient,
 * both of which say more than a generic placeholder would.
 */
export const PHOTO_FALLBACK = '/photo-unavailable.svg';

/** Is the mirror configured at all? */
export function mirrorEnabled(): boolean {
  return BASE.length > 0;
}

const WIKI_THUMB = /\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/\d+px-/;

/** The Commons filename inside a thumbnail URL, decoded. */
export function mirrorFileName(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(WIKI_THUMB);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * FNV-1a, 32 bits, as eight hex characters.
 *
 * Present only to disambiguate two filenames that sanitise to the same ASCII
 * string - the readable part of the path is the filename itself, so this is a
 * tiebreaker rather than the identity. Synchronous and dependency-free, which
 * `crypto.subtle` is not: it is async, and this runs inside render.
 *
 * `mirror-photos.mjs` asserts the whole catalog produces no two identical paths,
 * so a collision fails a run rather than quietly overwriting a photograph.
 */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The storage path for a Commons filename. Deterministic, so re-running the
 * script overwrites rather than accumulating copies.
 *
 * Restricted to `A-Za-z0-9._-`: every one of those is unreserved in a URL, so
 * the path needs no percent-encoding and the store cannot hand back a URL that
 * is encoded differently from the one derived here. Commons filenames are full
 * of spaces, parentheses, apostrophes and non-Latin scripts, and guessing how a
 * given SDK encodes each of those is exactly the kind of assumption that turns
 * into 3,000 broken images.
 */
export function mirrorPathname(fileName: string): string {
  const ascii = fileName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-96);
  return `catalog-photos/${MIRROR_WIDTH}/${fnv1a(fileName)}-${ascii || 'photo'}`;
}

/** The mirrored URL for a Commons thumbnail, or null when there is not one. */
export function mirrorUrl(url: string | undefined): string | null {
  if (!BASE) return null;
  const file = mirrorFileName(url);
  if (!file) return null;
  return `${BASE}/${mirrorPathname(file)}`;
}

/**
 * The URL to render. The mirror when it is configured, the original otherwise.
 *
 * Non-Commons photographs (the handful of Unsplash country heroes) pass through
 * untouched - they are not in the archive, and `next/image` optimises them from
 * their own host either way.
 */
export function photoSrc(url: string): string;
export function photoSrc(url: string | undefined): string | undefined;
export function photoSrc(url: string | undefined): string | undefined {
  if (!url) return url;
  return mirrorUrl(url) ?? url;
}

/**
 * A `srcSet` of Commons widths NARROWER than the one a URL already names.
 *
 * Used only while the mirror is unconfigured, so a low-density screen still gets
 * a 250px file rather than the 500px one the catalog stores. It never widens,
 * and the reason is that it CANNOT: widening is only safe with the source width
 * and Wikimedia's list of servable widths in hand, and neither is available in
 * the browser - the manifest that carries them is 828KB and server-only. See
 * `widenedThumb`, which has both. Getting the wide variants back everywhere is
 * the mirror's job, where we know what we stored.
 *
 * Returns undefined when there is nothing narrower to offer, so the attribute is
 * omitted rather than emitted empty.
 */
const WIKI_THUMB_WIDTH = /^(https:\/\/upload\.wikimedia\.org\/\S*\/)(\d+)px-([^/]+)$/;

export function thumbShrinkSrcSet(url: string): string | undefined {
  const m = url.match(WIKI_THUMB_WIDTH);
  if (!m) return undefined;
  const current = Number(m[2]);
  const narrower = [250, 330, 500].filter((w) => w < current);
  if (narrower.length === 0) return undefined;
  return [...narrower.map((w) => `${m[1]}${w}px-${m[3]} ${w}w`), `${url} ${current}w`].join(', ');
}

/**
 * The widest thumbnail Wikimedia will actually serve for a file, capped at
 * `ceiling`.
 *
 * This is the ONLY place in the repo that deliberately asks Wikimedia for a
 * thumbnail WIDER than a URL already names, and two rules make it safe:
 *
 * 1. **Never past the known source width, and never at all without one.**
 *    Wikimedia does not upscale. With no source width the width already in the
 *    URL is the only one proven to exist, so it is left alone - the safe
 *    direction to be wrong is downwards, because a narrower thumbnail always
 *    exists and a wider one does not necessarily.
 * 2. **Only a width on Wikimedia's own list.** `Math.min(ceiling, source)` is
 *    the obvious implementation and it is wrong: a 900px original would be asked
 *    for 900px and get an HTTP 400, because 900 is not a standard size. It has
 *    to round DOWN to a bucket, never up, or rule 1 is broken by rule 2.
 *
 * Between them, these are the two independent reasons a widened URL dies, and
 * this repo had only ever written down the first.
 *
 * Two callers, which is why it lives here rather than beside either of them:
 * `scripts/mirror-photos.mjs` archiving a copy, and `lib/server/photoCredit.ts`
 * building a share card. Both need the real source width, which only the credits
 * manifest carries - this function cannot look it up and must be handed it.
 */
export function widenedThumb(
  url: string,
  sourceWidth: number | null | undefined,
  ceiling: number = MIRROR_WIDTH,
): { url: string; width: number | null } {
  const m = url.match(WIKI_THUMB_WIDTH);
  if (!m) return { url, width: null };
  const current = Number(m[2]);
  if (!sourceWidth || sourceWidth <= current) return { url, width: current };
  const limit = Math.min(ceiling, sourceWidth);
  const width = [...STANDARD_THUMB_WIDTHS].reverse().find((w) => w <= limit && w > current);
  if (!width) return { url, width: current };
  return { url: `${m[1]}${width}px-${m[3]}`, width };
}
