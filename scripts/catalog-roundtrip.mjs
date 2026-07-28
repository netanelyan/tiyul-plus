// הוכחה שההעברה ל-Supabase היא העתקה טהורה. **אינו נוגע ברשת.**
//
// מריץ files -> rows -> files ומשווה השוואה עמוקה מול המקור. אם משהו
// אבד, נוסף, שוכתב או שינה סדר - הבדיקה נופלת ומדפיסה את הנתיב המדויק
// של ההבדל הראשון.
//
// **למה זה ולא ספירה:** ספירת מדינות/יעדים/מקומות יכולה להיות מושלמת
// בזמן ששדה `kosherNote` נשמט מכל רשומה. הספירה היא תנאי הכרחי ולא
// מספיק. כאן משווים כל בייט של כל שדה.
//
// הרצה: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/catalog-roundtrip.mjs
import { countries } from '../src/data/countries.ts';
import { destinations } from '../src/data/destinations.ts';
import { catalogToRows, rowsToCatalog } from './lib/catalogMap.mjs';

/** משווה עמוק ומחזיר את הנתיב להבדל הראשון, או null אם זהים. */
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
    // נוכחות מפתח היא חלק מהנתונים: שדה אופציונלי שנעדר במקור חייב
    // להיעדר גם אחרי החזרה, ולא להופיע כ-undefined או null.
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

// דגימה נקודתית שמודפסת תמיד, כדי שאפשר יהיה לראות טקסט אמיתי ולא רק
// סטטוס "עבר". נבחרו רשומות עם שדות אופציונליים, כשרות ועברית.
const samples = ['dxb-burj-khalifa', 'nyc-katz', 'vie-alef-alef', 'cyc-oia', 'ba-la-boca'];
console.log('\n--- spot checks (byte comparison of every field) ---');
for (const id of samples) {
  let before = null, after = null;
  for (const d of destinations) for (const p of d.places) if (p.id === id) before = p;
  for (const d of back.destinations) for (const p of d.places) if (p.id === id) after = p;
  if (!before) { console.log(`  ${id}: NOT FOUND in source`); continue; }
  // משווים שדה-שדה ולא JSON.stringify: stringify רגיש לסדר המפתחות,
  // וסדר מפתחות באובייקט אינו נתון. מה שנבדק כאן הוא שכל שדה קיים
  // בשני הצדדים ושהבייטים שלו זהים.
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

// ---------- שלב 2: המדפיס עצמו ----------
// עד כאן נבדק המיפוי בזיכרון. עכשיו נבדק שהקובץ שנוצר, אחרי שנכתב לדיסק
// ונטען מחדש כ-TypeScript אמיתי, עדיין מכיל בדיוק את אותם נתונים. זה מה
// שתופס באג ציטוט - גרש בתוך שם לטיני, בקסלאש, או עברית עם גרשיים.
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
