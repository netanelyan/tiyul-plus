// The import attribute is required, not decorative: Node 24 refuses a JSON
// import without it, and because this module sits in the import graph of the
// catalog, ten test suites crashed on load rather than failing - so they
// stopped running silently. The bundler accepts the attribute either way.
import credits from '../../../scripts/photo-credits.json' with { type: 'json' };

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
