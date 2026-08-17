import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * Server only - **parsing the admin area's search box**.
 *
 * Netanel: *"Treat the search box as hostile input. It is the part of the site
 * most worth attacking."* He is right: it is the only box in the product with
 * access to everyone's data sitting behind it.
 *
 * ## The central decision: the user's string never enters any query
 *
 * Not "well encoded" and not "filtered" - it **does not enter**. The three search
 * modes are converted here into values the server itself knows, and only those go on:
 *
 * | what was typed | what continues to the database |
 * |---|---|
 * | email | a uuid we got from GoTrue after an **exact** match |
 * | destination/country | a slug from our own catalog - a closed list in code |
 * | trip name | **nothing** - the filter runs in memory on rows already fetched |
 *
 * So even if `pgrest.ts` broke tomorrow there is no channel here: no user string
 * reaches a query. `pgrest` stays the second layer, not the first.
 *
 * ## What else is blocked here
 *
 * Length (search is not a channel for uploading data), control characters, and
 * LIKE wildcards. The last are technically unnecessary - the filtering happens in
 * memory anyway - but they go so that search behaviour is predictable rather than
 * a pattern the user can run.
 */

/** Maximum query length. The longest trip name in the catalog is ~40 characters. */
export const MAX_QUERY_CHARS = 80;

export type AdminQuery =
  | { kind: 'email'; email: string }
  | { kind: 'place'; slugs: string[]; label: string }
  | { kind: 'name'; needle: string }
  | { kind: 'invalid'; why: string };

/** Email by shape only - not full validation, just "this looks like an address" */
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/**
 * Normalisation for text search: collapse repeated spaces, strip Latin diacritics
 * and wildcards. It does **not** strip Hebrew and does not strip "odd" characters -
 * a trip name can contain anything, and the search runs in memory so there is
 * nothing to protect there.
 */
export function normalizeNeedle(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[%_*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Every destination and country name, once. This is the closed list. */
const PLACES: { slug: string; label: string; names: string[]; countrySlug?: string }[] = [
  ...destinations.map((d) => ({
    slug: d.slug,
    label: d.name,
    names: [d.name, d.nameLocal ?? '', d.slug].filter(Boolean).map(normalizeNeedle),
  })),
  ...countries.map((c) => ({
    slug: c.slug,
    label: c.name,
    names: [c.name, c.nameLocal ?? '', c.slug].filter(Boolean).map(normalizeNeedle),
    countrySlug: c.slug,
  })),
];

/** Catalog destinations by country - so that searching "Italy" finds Rome and Venice */
const BY_COUNTRY = new Map<string, string[]>();
for (const d of destinations) {
  BY_COUNTRY.set(d.countrySlug, [...(BY_COUNTRY.get(d.countrySlug) ?? []), d.slug]);
}

/**
 * The parse. `mode` comes from the interface and not from the text, so a trip-name
 * search that happens to look like an email is not misread as an email search.
 */
export function parseAdminQuery(raw: unknown, mode: unknown): AdminQuery {
  if (typeof raw !== 'string') return { kind: 'invalid', why: 'לא טקסט' };
  const text = raw.trim();
  if (!text) return { kind: 'invalid', why: 'ריק' };
  if (text.length > MAX_QUERY_CHARS) return { kind: 'invalid', why: 'ארוך מדי' };
  // Control characters do not arrive by any legitimate route
  if (/[\u0000-\u001f\u007f]/.test(text)) return { kind: 'invalid', why: 'תווי בקרה' };

  if (mode === 'email') {
    const email = text.toLowerCase();
    if (!EMAIL.test(email)) return { kind: 'invalid', why: 'לא נראה כמו כתובת מייל' };
    return { kind: 'email', email };
  }

  if (mode === 'place') {
    /*
      **A closed list.** The text is converted to a slug from our own catalog or
      rejected; there is no path by which a free-form string becomes a search condition.
    */
    const needle = normalizeNeedle(text);
    if (!needle) return { kind: 'invalid', why: 'ריק' };
    const hit =
      PLACES.find((p) => p.names.some((n) => n === needle)) ??
      PLACES.find((p) => p.names.some((n) => n.includes(needle)));
    if (!hit) return { kind: 'invalid', why: 'לא נמצא יעד או מדינה בשם הזה' };
    const slugs = hit.countrySlug ? (BY_COUNTRY.get(hit.countrySlug) ?? []) : [hit.slug];
    return { kind: 'place', slugs, label: hit.label };
  }

  if (mode === 'name') {
    const needle = normalizeNeedle(text);
    if (needle.length < 2) return { kind: 'invalid', why: 'קצר מדי' };
    return { kind: 'name', needle };
  }

  return { kind: 'invalid', why: 'מצב חיפוש לא מוכר' };
}

/** In-memory name matching - the same normalisation on both sides */
export const nameMatches = (tripName: string, needle: string): boolean =>
  normalizeNeedle(tripName).includes(needle);
