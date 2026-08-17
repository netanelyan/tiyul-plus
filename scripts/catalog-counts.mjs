/**
 * The catalog's real numbers, in one place.
 *
 * ## Why this is a script
 *
 * The catalog numbers appear in marketing material, on the about page and in session
 * summaries, and they go stale **every time somebody adds a city** - i.e. almost every day.
 * This log already records one occasion where a wrong number was reported in a summary ("39
 * records across 29 destinations" when in fact there were 42 across 28), and the conclusion
 * recorded there was to count before quoting.
 *
 * This is the script that makes that conclusion cheap.
 *
 * Usage:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/catalog-counts.mjs [--json]
 */
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';
import { calendar } from '../src/data/calendar.ts';

const places = destinations.flatMap((d) => d.places ?? []);
const isKosher = (p) => String(p.category ?? '').startsWith('kosher');

const counts = {
  countries: countries.length,
  destinations: destinations.length,
  places: places.length,
  placesWithPhoto: places.filter((p) => p.photo).length,
  kosherPlaces: places.filter(isKosher).length,
  kosherCities: destinations.filter((d) => (d.places ?? []).some(isKosher)).length,
  calendarEntries: calendar.length,
  calendarConfirmed: calendar.filter((e) => e.datesConfirmed).length,
  ratedDestinations: destinations.filter((d) => d.editorialRating).length,
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(counts, null, 2) + '\n');
} else {
  const n = (x) => x.toLocaleString('en-US');
  console.log(`
מספרי הקטלוג, נכון להרצה הזאת
─────────────────────────────
מדינות                ${n(counts.countries)}
יעדים                 ${n(counts.destinations)}
מקומות                ${n(counts.places)}
  מתוכם עם תמונה      ${n(counts.placesWithPhoto)}
רשומות כשרות          ${n(counts.kosherPlaces)}  ב-${n(counts.kosherCities)} ערים
לוח אירועים וסגירות   ${n(counts.calendarEntries)}  (${n(counts.calendarConfirmed)} עם תאריכים מאושרים)
יעדים עם דירוג מערכת  ${n(counts.ratedDestinations)}

לצטט מכאן, לא מהזיכרון ולא מסיכום סשן ישן.
`);
}
