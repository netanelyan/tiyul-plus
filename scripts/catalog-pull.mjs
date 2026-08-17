// Generating `src/data/countries.ts` and `src/data/destinations.ts` from Supabase.
//
// This is the direction that makes Supabase the source of truth: edit in
// the database, run this, and the files are rebuilt. The site keeps
// reading files and building statically, so production load time does not
// change at all.
//
// **TypeScript output and not JSON, deliberately.** JSON would lose tsc's
// type checking on the data, and that is exactly what catches `'shopping'`
// as an invalid tag or a `score` out of range. The project has been burned
// by this four times.
//
// **The generated file's formatting will not be byte-identical to the
// hand-written file**, because the hand-written files are not uniformly
// formatted (and CLAUDE.md forbids running prettier on them). What IS
// guaranteed: the decoded data is identical. `scripts/catalog-roundtrip.mjs`
// proves that with a deep comparison, and it is worth running after every
// generation.
//
// Running:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/catalog-pull.mjs
//   (SUPABASE_ANON_KEY also works - the read is publicly open per the RLS.)
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { rowsToCatalog } from './lib/catalogMap.mjs';
import { emitCountries, emitDestinations } from './lib/catalogEmit.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL and a key. Environment only - never the repo.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** Supabase מחזיר 1000 שורות כברירת מחדל; 1,510 מקומות דורשים דפדוף. */
async function all(table) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const [countryRows, destinationRows, placeRows] = [await all('catalog_countries'), await all('catalog_destinations'), await all('catalog_places')];
console.log('from supabase: countries=%d destinations=%d places=%d', countryRows.length, destinationRows.length, placeRows.length);

const { countries, destinations } = rowsToCatalog({ countryRows, destinationRows, placeRows });

// ההדפסה עצמה חיה ב-scripts/lib/catalogEmit.mjs כדי שאפשר יהיה לבדוק
// אותה בלי רשת. ראה catalog-roundtrip.mjs.
const cSrc = emitCountries(countries);
const dSrc = emitDestinations(destinations);
writeFileSync('src/data/countries.generated.ts', cSrc);
writeFileSync('src/data/destinations.generated.ts', dSrc);
console.log('wrote src/data/countries.generated.ts and src/data/destinations.generated.ts');
console.log('Review the diff, then replace the hand-written files. Run catalog-roundtrip.mjs and validate-catalog.mjs before committing.');
