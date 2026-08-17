// Printing the catalog as TypeScript literals.
//
// **Why this is a separate file:** so that `catalog-roundtrip.mjs` can test the
// printer without a network. Testing the mapping alone is not enough - a quoting
// bug here would corrupt text without any count noticing. The project has already
// been burned by apostrophes inside Hebrew strings, so this is tested rather than
// trusted to the eye.

/**
 * String quoting. Prefers single quotes; switches to double quotes when the text
 * contains an apostrophe (Latin names like "Schindler's"; Hebrew uses the
 * geresh U+05F3, which requires nothing). A string containing both is handled with explicit
 * escaping, so there is no breaking case. Backslash must be escaped first,
 * otherwise it escapes the escape that follows it.
 */
export function q(s) {
  const esc = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return esc.includes("'") ? `"${esc.replace(/"/g, '\\"')}"` : `'${esc}'`;
}

/** Deterministic literal: the same input always yields the same output, no phantom diff. */
export function lit(v, indent = 0) {
  const pad = ' '.repeat(indent);
  if (v === null) return 'null';
  if (typeof v === 'string') return q(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const flat = v.every((x) => typeof x !== 'object' || x === null);
    const inline = `[${v.map((x) => lit(x, 0)).join(', ')}]`;
    if (flat && inline.length + indent <= 96) return inline;
    return `[\n${v.map((x) => `${pad}  ${lit(x, indent + 2)}`).join(',\n')},\n${pad}]`;
  }
  const entries = Object.entries(v).filter(([, val]) => val !== undefined);
  if (entries.length === 0) return '{}';
  const flat = entries.every(([, val]) => typeof val !== 'object' || val === null);
  const inline = `{ ${entries.map(([k, val]) => `${k}: ${lit(val, 0)}`).join(', ')} }`;
  if (flat && inline.length + indent <= 96) return inline;
  return `{\n${entries.map(([k, val]) => `${pad}  ${k}: ${lit(val, indent + 2)}`).join(',\n')},\n${pad}}`;
}

const banner = (what) => `// ${what}
//
// ** Generated automatically from Supabase by scripts/catalog-pull.mjs. **
// Do not edit by hand: edits here are wiped on the next run. The source of truth is the
// catalog_* tables in Supabase. After regenerating, run:
//   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/catalog-roundtrip.mjs
//   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs
`;

export function emitCountries(countries) {
  return `${banner('מדינות הקטלוג (עברית, RTL)')}
import type { Country } from '@/lib/types';

export const countries: Country[] = ${lit(countries, 0)};

export function getCountryBySlug(slug: string): Country | undefined {
  return countries.find((c) => c.slug === slug);
}
`;
}

export function emitDestinations(destinations) {
  return `${banner('יעדי הקטלוג (עברית, RTL)')}
import type { Destination } from '@/lib/types';

export const destinations: Destination[] = ${lit(destinations, 0)};

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
`;
}
