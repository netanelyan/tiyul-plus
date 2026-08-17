// Proof that the migration to Supabase is a pure copy. **Touches no network.**
//
// Runs files -> rows -> files and deep-compares against the source. If
// anything was lost, added, rewritten or reordered - the check fails and
// prints the exact path of the first difference.
//
// **Why this and not a count:** counting countries/destinations/places can
// be perfect while the `kosherNote` field is dropped from every record. The
// count is a necessary condition, not a sufficient one. Here every byte of
// every field is compared.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/catalog-roundtrip.mjs
import { countries } from '../src/data/countries.ts';
import { destinations } from '../src/data/destinations.ts';
import { catalogToRows, rowsToCatalog } from './lib/catalogMap.mjs';

/** Deep-compares and returns the path to the first difference, or null if identical. */
function firstDiff(a, b, path = '') {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b}`;
  if (a === null || b === null) return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs non-array`;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return `${path}: length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    // Key presence is part of the data: an optional field absent in the
    // source must also be absent after the return trip, and not appear as
    // undefined or null.
    const missing = ka.filter((k) => !kb.includes(k));
    const extra = kb.filter((k) => !ka.includes(k));
    if (missing.length) return `${path}: key(s) LOST -> ${missing.join(', ')}`;
    if (extra.length) return `${path}: key(s) INVENTED -> ${extra.join(', ')}`;
    for (const k of ka) {
      const d = firstDiff(a[k], b[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
    return null;
  }
  return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
}

const placesBefore = destinations.reduce((n, d) => n + d.places.length, 0);
const rows = catalogToRows(countries, destinations);
const back = rowsToCatalog(rows);
const placesAfter = back.destinations.reduce((n, d) => n + d.places.length, 0);

console.log('BEFORE (src/data)      countries=%d destinations=%d places=%d', countries.length, destinations.length, placesBefore);
console.log('ROWS   (would insert)  countries=%d destinations=%d places=%d', rows.countryRows.length, rows.destinationRows.length, rows.placeRows.length);
console.log('AFTER  (rebuilt)       countries=%d destinations=%d places=%d', back.countries.length, back.destinations.length, placesAfter);

const countsMatch =
  countries.length === rows.countryRows.length && rows.countryRows.length === back.countries.length &&
  destinations.length === rows.destinationRows.length && rows.destinationRows.length === back.destinations.length &&
  placesBefore === rows.placeRows.length && rows.placeRows.length === placesAfter;

const dc = firstDiff(countries, back.countries, 'countries');
const dd = firstDiff(destinations, back.destinations, 'destinations');

console.log('\ncounts identical: %s', countsMatch ? 'YES' : 'NO');
console.log('countries deep-equal: %s', dc ? `NO -> ${dc}` : 'YES');
console.log('destinations deep-equal: %s', dd ? `NO -> ${dd}` : 'YES');

// A spot sample that always prints, so real text can be seen rather than
// just a "passed" status. Records with optional fields, kashrut and Hebrew
// were chosen.
const samples = ['dxb-burj-khalifa', 'nyc-katz', 'vie-alef-alef', 'cyc-oia', 'ba-la-boca'];
console.log('\n--- spot checks (byte comparison of every field) ---');
for (const id of samples) {
  let before = null, after = null;
  for (const d of destinations) for (const p of d.places) if (p.id === id) before = p;
  for (const d of back.destinations) for (const p of d.places) if (p.id === id) after = p;
  if (!before) { console.log(`  ${id}: NOT FOUND in source`); continue; }
  // Compared field by field, not with JSON.stringify: stringify is
  // sensitive to key order, and object key order is not data. What is
  // checked here is that every field exists on both sides and that its
  // bytes are identical.
  const keysB = Object.keys(before).sort();
  const keysA = Object.keys(after ?? {}).sort();
  const sameKeys = JSON.stringify(keysB) === JSON.stringify(keysA);
  const badFields = keysB.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const orderOnly = JSON.stringify(Object.keys(before)) !== JSON.stringify(Object.keys(after ?? {}));
  const verdict = !sameKeys ? 'KEY SET DIFFERS' : badFields.length ? `FIELDS DIFFER: ${badFields.join(',')}` : 'BYTE-IDENTICAL';
  console.log(`  ${id.padEnd(18)} ${verdict.padEnd(16)} fields=${keysB.length}${orderOnly ? ' (key order re-sorted, not a data change)' : ''}`);
  if (verdict === 'BYTE-IDENTICAL') console.log(`      name="${before.name}"  desc[0..44]="${before.description.slice(0, 44)}"`);
}

const ok = countsMatch && !dc && !dd;

// ---------- Stage 2: the emitter itself ----------
// Up to here the in-memory mapping was checked. Now we check that the
// generated file, after being written to disk and re-loaded as real
// TypeScript, still contains exactly the same data. This is what catches a
// quoting bug - an apostrophe inside a Latin name, a backslash, or Hebrew
// with quotation marks.
import { writeFileSync, mkdirSync } from 'node:fs';
import { emitCountries, emitDestinations } from './lib/catalogEmit.mjs';

mkdirSync('.cache/roundtrip', { recursive: true });
writeFileSync('.cache/roundtrip/countries.ts', emitCountries(back.countries).replace("from '@/lib/types'", "from '../../src/lib/types.ts'"));
writeFileSync('.cache/roundtrip/destinations.ts', emitDestinations(back.destinations).replace("from '@/lib/types'", "from '../../src/lib/types.ts'"));

const reC = (await import('../.cache/roundtrip/countries.ts')).countries;
const reD = (await import('../.cache/roundtrip/destinations.ts')).destinations;
const rePlaces = reD.reduce((n, d) => n + d.places.length, 0);

console.log('\n--- stage 2: emitted TypeScript, written to disk, re-parsed ---');
console.log('RE-PARSED             countries=%d destinations=%d places=%d', reC.length, reD.length, rePlaces);
const ec = firstDiff(countries, reC, 'countries');
const ed = firstDiff(destinations, reD, 'destinations');
console.log('countries deep-equal after emit+parse: %s', ec ? `NO -> ${ec}` : 'YES');
console.log('destinations deep-equal after emit+parse: %s', ed ? `NO -> ${ed}` : 'YES');

const emitOk = reC.length === countries.length && reD.length === destinations.length && rePlaces === placesBefore && !ec && !ed;
console.log(`\n${ok && emitOk ? 'PASS - round trip AND emitter are both lossless.' : 'FAIL'}`);
process.exit(ok && emitOk ? 0 : 1);
