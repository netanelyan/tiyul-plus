// The import attribute is required, not decorative: Node 24 refuses a JSON
// import without it, and because this module sits in the import graph of the
// catalog, ten test suites crashed on load rather than failing - so they
// stopped running silently. The bundler accepts the attribute either way.
import credits from '../../../scripts/photo-credits.json' with { type: 'json' };
import { widenedThumb } from '../photoMirror';

/**
 * Who took each photograph, and how wide the original is.
 *
 * ## Why this exists at all
 *
 * The catalog hotlinks 3,363 Wikimedia images and credited none of them.
 * Measured across the 2,978 distinct files: **2,686 are CC BY or CC BY-SA**,
 * both of which require the author and the licence to be named. Only 292 are
 * public domain or CC0, where attribution is a courtesy rather than a
 * condition. This is a commercial site, so for roughly nine images in ten the
 * missing credit was a licence breach rather than an oversight.
 *
 * ## Server only, and that is load-bearing
 *
 * The manifest is 828KB. It must never be imported by a client component -
 * the catalog itself was once shipped to the browser by accident and cost
 * 492KB on every page. Credits are resolved here and passed down as props,
 * the same rule `cityNames` and `destinationCards` already follow.
 */

interface CreditRecord {
  artist?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  descriptionUrl?: string | null;
  width?: number | null;
  height?: number | null;
  missing?: boolean;
}

const BY_FILE = credits as Record<string, CreditRecord>;

/** The Commons filename inside a thumbnail URL, decoded. */
export function fileNameFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/\d+px-/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export interface PhotoCredit {
  /** The filename, used as the React key and as the last-resort label. */
  file: string;
  artist: string | null;
  license: string | null;
  licenseUrl: string | null;
  /** The Commons file page - where a licence expects a reader to be sent. */
  descriptionUrl: string | null;
}

export function creditFor(url: string | undefined): PhotoCredit | null {
  const file = fileNameFromUrl(url);
  if (!file) return null;
  const rec = BY_FILE[file];
  if (!rec || rec.missing) return null;
  return {
    file,
    artist: rec.artist ?? null,
    license: rec.license ?? null,
    licenseUrl: rec.licenseUrl ?? null,
    descriptionUrl: rec.descriptionUrl ?? null,
  };
}

/**
 * Credits for a page's photographs, deduplicated and ordered.
 *
 * One entry per FILE, not per use: a photograph that appears as both the hero
 * and a card is one credit, and listing it twice would read as two different
 * photographs.
 */
export function creditsFor(urls: (string | undefined)[]): PhotoCredit[] {
  const seen = new Set<string>();
  const out: PhotoCredit[] = [];
  for (const u of urls) {
    const c = creditFor(u);
    if (!c || seen.has(c.file)) continue;
    seen.add(c.file);
    out.push(c);
  }
  return out;
}

/**
 * Facebook's floor for a large share card. Below it a link renders as a small
 * square thumbnail instead of a picture, which is the whole bug being fixed.
 */
const LARGE_CARD_MIN_WIDTH = 600;

/** The smallest width Wikimedia will serve that clears that floor. */
const LARGE_CARD_STEP_UP = 960;

/** What `openGraph.images` and `twitter.images` take. */
export interface ShareImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/**
 * The photograph for a page's share card, as wide as the source really allows.
 *
 * ## The bug this exists to fix
 *
 * The catalog stores most photographs as 500px thumbnails, and both the country
 * and destination pages used that URL verbatim as `og:image` while declaring
 * `twitter:card=summary_large_image`. Facebook and WhatsApp drop to a small
 * square thumbnail below roughly 600px wide, so 77 of 83 country pages and 58 of
 * 166 destinations shared as a thumbnail rather than a picture. WhatsApp is how
 * this product actually spreads, which makes that half the catalog's most
 * valuable moment rendered at its weakest.
 *
 * ## Why widening is safe here and nowhere else in the client
 *
 * `thumbShrinkSrcSet` refuses to widen because it runs in the browser with no
 * way to know how big the original is. This module is server-only and holds the
 * manifest, so it can hand `widenedThumb` the real source width - which is the
 * single condition that makes asking Commons for a bigger thumbnail anything
 * other than the mistake that killed 170 URLs. A source narrower than 1200 is
 * left exactly where it is rather than rounded up hopefully.
 *
 * ## The dimensions are declared, and they describe the bytes
 *
 * `width`/`height` let a scraper lay the card out from the tags without
 * fetching the image first - WhatsApp frequently renders a link before the
 * download finishes, and a card with no declared size is the one that arrives
 * without a picture.
 *
 * They describe the FILE, which is not always the same as the original. Nine
 * catalog photographs are stored asking for 960px from an original of 600-869px,
 * and the returned bytes measure a real 960px wide - Wikimedia upscales to a
 * listed size rather than refusing. So 960 is the honest number there, and the
 * original's width would have been the wrong one. Read from the JPEG header
 * rather than reasoned about, because the imageinfo API describes that same
 * request as "unscaled" and is misleading about it.
 *
 * ## The one place this deliberately upscales
 *
 * `widenedThumb` refuses to ask for more detail than the original holds, which
 * is right for the archive - storing an upscaled copy spends bytes on pixels
 * that carry nothing. But six catalog photographs have originals of 604-900px,
 * and the largest listed width that fits under 960 is 500 - so the strict rule
 * leaves exactly those six sharing as a thumbnail with no way out.
 *
 * For a share card that is the wrong trade, so they step up to 960. This is
 * measured rather than hoped: all six return HTTP 200 and the bytes really are
 * 960px wide, because Wikimedia upscales to a listed size rather than refusing.
 * The declared dimensions therefore still describe the file. What is lost is
 * sharpness in a preview thumbnail; what is gained is the preview existing at
 * all.
 *
 * Non-Commons photographs - the handful of Unsplash heroes, already requested at
 * 1600px - pass through with no dimensions, because we do not know their aspect
 * ratio and a guessed one is worse than an absent one.
 */
export function shareImage(url: string | undefined, alt: string): ShareImage | null {
  if (!url) return null;
  const file = fileNameFromUrl(url);
  const rec = file ? BY_FILE[file] : undefined;
  let { url: wide, width } = widenedThumb(url, rec?.width);

  if (rec?.width && width && width < LARGE_CARD_MIN_WIDTH) {
    const step = widenedThumb(url, LARGE_CARD_STEP_UP);
    if (step.width === LARGE_CARD_STEP_UP) ({ url: wide, width } = step);
  }

  if (!width || !rec?.width || !rec?.height) return { url: wide, alt };
  // The bytes are `width` even when that is more than the original held, so the
  // declared size describes the file rather than the source.
  return { url: wide, alt, width, height: Math.round((width * rec.height) / rec.width) };
}
