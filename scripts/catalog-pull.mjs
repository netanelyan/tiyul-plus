// יצירת `src/data/countries.ts` ו-`src/data/destinations.ts` מ-Supabase.
//
// זה הכיוון שהופך את Supabase למקור האמת: עורכים בדאטהבייס, מריצים את
// זה, והקבצים נבנים מחדש. האתר ממשיך לקרוא קבצים ולהיבנות סטטית, ולכן
// זמן הטעינה בפרודקשן לא משתנה בכלל.
//
// **פלט TypeScript ולא JSON, בכוונה.** JSON היה מאבד את בדיקת הטיפוסים
// של tsc על הדאטה, וזה בדיוק מה שתופס `'shopping'` כתגית לא חוקית או
// `score` מחוץ לטווח. הפרויקט נשרף על זה ארבע פעמים.
//
// **הפורמט של הקובץ שנוצר לא יהיה זהה בייט-בבייט לקובץ הידני**, כי
// הקבצים הידניים אינם מעוצבים באופן אחיד (ו-CLAUDE.md אוסר להריץ עליהם
// prettier). מה שכן מובטח: הנתונים המפוענחים זהים. `scripts/catalog-roundtrip.mjs`
// מוכיח את זה בהשוואה עמוקה, וכדאי להריץ אותו אחרי כל יצירה.
//
// הרצה:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/catalog-pull.mjs
//   (אפשר גם עם SUPABASE_ANON_KEY - הקריאה פתוחה לציבור לפי ה-RLS.)
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
