// The import attribute is required rather than decorative: Node 24 refuses a JSON import
// without it, and this module sits in the import graph of a test - which is how ten suites
// once stopped running silently rather than failing. The bundler accepts it either way.
import ledger from './content-dates.json' with { type: 'json' };

/**
 * When the content behind a URL last actually changed.
 *
 * The ledger is produced by `scripts/content-dates.mjs`, which hashes exactly the
 * data that renders each page and moves the date only when that hash changes -
 * so adding places to Vienna re-dates Vienna and leaves the other 269 pages
 * alone. Read that script's header for why neither the build date nor git can
 * supply this honestly.
 *
 * ## Server-only by use, not by accident
 *
 * The only consumer is `app/sitemap.ts`, which runs at build time. The file is
 * ~20KB and has no business in a browser bundle; nothing imports it from a
 * `'use client'` component and nothing should.
 */
interface LedgerEntry {
  /** Hash of the rendering data. Compared by `sitemap.test.ts`, unused here. */
  hash: string;
  /** YYYY-MM-DD. */
  date: string;
}

const BY_PATH = ledger as Record<string, LedgerEntry>;

/**
 * The `lastmod` for a path, or `undefined` when we do not know.
 *
 * Undefined is a real answer and the right one for a page added since the last
 * ledger run: `<lastmod>` is optional per the sitemap protocol, and omitting it
 * costs nothing, while emitting today's date for a page that has not changed
 * today is a false statement that teaches Google to ignore the field across the
 * whole file.
 *
 * Returns a `Date` because that is what Next's `MetadataRoute.Sitemap` takes.
 * The stored value is a plain date with no time, so it is parsed at UTC noon -
 * `new Date('2026-09-20')` is midnight UTC, which renders as the 19th for any
 * build machine west of Greenwich. The same trap `lib/trip/dates.ts` records.
 */
export function lastModified(path: string): Date | undefined {
  const entry = BY_PATH[path];
  if (!entry) return undefined;
  const m = entry.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/** Every path the ledger knows about. Used by the test, not at render time. */
export function ledgerPaths(): string[] {
  return Object.keys(BY_PATH);
}

/** The recorded hash for a path, for the staleness check in `sitemap.test.ts`. */
export function ledgerHash(path: string): string | undefined {
  return BY_PATH[path]?.hash;
}
