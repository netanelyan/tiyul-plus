// Uploading the catalog from `src/data/*.ts` to Supabase. **Safe to run twice.**
//
// Idempotency: an upsert on the primary key, followed by deleting records that are no
// longer in the files. Two consecutive runs produce exactly the same state, with no duplicates.
//
// Keys: **from environment variables only.** SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are required. The service role bypasses RLS, which is why this is the only way to write
// to the catalog - the browser never can. Do not put this key in NEXT_PUBLIC_* and do not
// commit it to the repo.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/catalog-push.mjs
//   Add --dry for a run that prints what would happen without writing.
import { createClient } from '@supabase/supabase-js';
import { countries } from '../src/data/countries.ts';
import { destinations } from '../src/data/destinations.ts';
import { catalogToRows } from './lib/catalogMap.mjs';

const DRY = process.argv.includes('--dry');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { countryRows, destinationRows, placeRows } = catalogToRows(countries, destinations);
console.log('source: countries=%d destinations=%d places=%d', countryRows.length, destinationRows.length, placeRows.length);

if (DRY) {
  console.log('[dry run] nothing written. Sample rows:');
  console.log('  country[0]    ', JSON.stringify(countryRows[0]).slice(0, 120));
  console.log('  destination[0]', JSON.stringify(destinationRows[0]).slice(0, 120));
  console.log('  place[0]      ', JSON.stringify(placeRows[0]).slice(0, 120));
  process.exit(0);
}
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Keys come from the environment only - never from the repo.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Supabase limits request size; small batches also give visible progress. */
async function upsertAll(table, rows, onConflict, chunk = 200) {
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + chunk), { onConflict });
    if (error) throw new Error(`${table} upsert failed at row ${i}: ${error.message}`);
    process.stdout.write(`\r  ${table}: ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log('');
}

// The upload order follows the foreign keys: countries -> destinations -> places.
await upsertAll('catalog_countries', countryRows, 'slug');
await upsertAll('catalog_destinations', destinationRows, 'slug');
await upsertAll('catalog_places', placeRows, 'destination_slug,id');

// Pruning: whatever is no longer in the files goes. The order is the reverse of the
// upload, again because of the foreign keys. Without this, a place deleted from the files
// would stay in the database forever.
const placeKeys = new Set(placeRows.map((p) => `${p.destination_slug}|${p.id}`));
const { data: dbPlaces, error: pe } = await db.from('catalog_places').select('destination_slug,id');
if (pe) throw new Error(pe.message);
const stalePlaces = (dbPlaces ?? []).filter((p) => !placeKeys.has(`${p.destination_slug}|${p.id}`));
for (const p of stalePlaces) await db.from('catalog_places').delete().eq('destination_slug', p.destination_slug).eq('id', p.id);

const destSlugs = new Set(destinationRows.map((d) => d.slug));
const { data: dbDests } = await db.from('catalog_destinations').select('slug');
const staleDests = (dbDests ?? []).filter((d) => !destSlugs.has(d.slug));
for (const d of staleDests) await db.from('catalog_destinations').delete().eq('slug', d.slug);

const countrySlugs = new Set(countryRows.map((c) => c.slug));
const { data: dbCountries } = await db.from('catalog_countries').select('slug');
const staleCountries = (dbCountries ?? []).filter((c) => !countrySlugs.has(c.slug));
for (const c of staleCountries) await db.from('catalog_countries').delete().eq('slug', c.slug);

console.log('pruned: countries=%d destinations=%d places=%d', staleCountries.length, staleDests.length, stalePlaces.length);

// Verification after writing: count from the database itself rather than trusting what we sent.
const count = async (t) => (await db.from(t).select('*', { count: 'exact', head: true })).count;
const [c1, c2, c3] = [await count('catalog_countries'), await count('catalog_destinations'), await count('catalog_places')];
console.log('in supabase: countries=%d destinations=%d places=%d', c1, c2, c3);
const ok = c1 === countryRows.length && c2 === destinationRows.length && c3 === placeRows.length;
console.log(ok ? 'PASS - counts match the source exactly.' : 'FAIL - counts do not match. Do not regenerate the data files.');
process.exit(ok ? 0 : 1);
